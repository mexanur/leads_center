import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  sendTelegramMessage,
  sendTelegramDocument,
  sendTelegramPhoto,
  formatLeadTelegramMessage,
} from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { leadId, chatIds, includeFiles = true } = body;

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    // Fetch full lead data including notes and files
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        files: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Determine destination chats
    let targetChatIds: string[] = [];

    if (Array.isArray(chatIds) && chatIds.length > 0) {
      targetChatIds = chatIds;
    } else {
      // Find default integration or all active integrations
      const defaultIntegration = await prisma.telegramIntegration.findFirst({
        where: { isDefault: true, isActive: true },
      });

      if (defaultIntegration) {
        targetChatIds = [defaultIntegration.chatId];
      } else {
        const activeIntegrations = await prisma.telegramIntegration.findMany({
          where: { isActive: true },
        });
        targetChatIds = activeIntegrations.map((i: { chatId: string }) => i.chatId);
      }
    }

    if (targetChatIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "No Telegram destinations connected. Go to user profile -> Integrations to connect @kargogroups_bot.",
        },
        { status: 400 }
      );
    }

    const messageHtml = formatLeadTelegramMessage(lead);
    const results: Array<{ chatId: string; success: boolean; error?: string }> = [];

    for (const chatId of targetChatIds) {
      // 1. Send the primary formatted lead profile card
      const sendRes = await sendTelegramMessage(chatId, messageHtml, {
        parse_mode: "HTML",
      });

      if (!sendRes.ok) {
        results.push({
          chatId,
          success: false,
          error: sendRes.description || "Failed to send message",
        });
        continue;
      }

      // 2. If includeFiles is true and the lead has files attached, send each file with pacing throttle
      if (includeFiles && lead.files && lead.files.length > 0) {
        for (const file of lead.files) {
          try {
            await new Promise((r) => setTimeout(r, 75)); // Pacing delay to avoid Telegram burst limits
            const isImage =
              file.mimeType?.startsWith("image/") ||
              /\.(jpg|jpeg|png|webp|heic)$/i.test(file.name);
            const caption = `<b>${lead.fullName}</b> — ${file.fileType.replace("_", " ")} (${file.name})`;

            if (isImage) {
              await sendTelegramPhoto(chatId, file.fileUrl, caption, {
                parse_mode: "HTML",
              });
            } else {
              await sendTelegramDocument(chatId, file.fileUrl, caption, {
                parse_mode: "HTML",
              });
            }
          } catch (fileErr) {
            console.error(`Error sending file ${file.name} to Telegram:`, fileErr);
          }
        }
      }

      results.push({ chatId, success: true });
    }

    // 3. Log activity on the lead
    const successfulCount = results.filter((r) => r.success).length;
    if (successfulCount > 0) {
      await prisma.activityLog.create({
        data: {
          leadId: lead.id,
          action: "TELEGRAM_SHARED",
          details: `Shared driver lead to ${successfulCount} Telegram destination(s)${
            includeFiles && lead.files.length > 0
              ? ` with ${lead.files.length} attached document(s)`
              : ""
          }`,
          userName: user?.name || "Recruiter",
        },
      });
    }

    return NextResponse.json({
      success: successfulCount > 0,
      totalTargets: targetChatIds.length,
      sentCount: successfulCount,
      results,
    });
  } catch (error) {
    console.error("Error sharing lead to Telegram:", error);
    return NextResponse.json(
      { error: "Failed to share lead to Telegram" },
      { status: 500 }
    );
  }
}
