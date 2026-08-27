import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendTelegramMessage,
  TELEGRAM_BOT_USERNAME,
} from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // Extract message or channel_post
    const message = update.message || update.channel_post;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();
    const chat = message.chat;
    const chatIdStr = String(chat.id);
    const chatTitle =
      chat.title ||
      [chat.first_name, chat.last_name].filter(Boolean).join(" ") ||
      `Chat ${chat.id}`;
    const chatType = chat.type || "private";
    const username = chat.username || message.from?.username || undefined;

    // Extract 4-digit or alphanumeric code e.g. "LC-7212", "7212", "/connect LC-7212", "/start LC-7212"
    let extractedCode: string | null = null;
    const directMatch = text.match(/LC[-_]?([A-Za-z0-9]{3,8})/i);
    if (directMatch) {
      extractedCode = `LC-${directMatch[1].toUpperCase()}`;
    } else {
      const digitsMatch = text.match(/\b([0-9]{4,6})\b/);
      if (digitsMatch) {
        extractedCode = `LC-${digitsMatch[1]}`;
      }
    }

    if (extractedCode) {
      // Look for pairing code in database
      const pairingCodeRecord = await prisma.telegramPairingCode.findFirst({
        where: {
          OR: [
            { code: extractedCode },
            { code: extractedCode.replace("LC-", "") },
          ],
          expiresAt: { gt: new Date() },
        },
      });

      if (pairingCodeRecord) {
        // Successful connection!
        const existingDefault = await prisma.telegramIntegration.findFirst({
          where: { isDefault: true },
        });

        const integration = await prisma.telegramIntegration.upsert({
          where: { chatId: chatIdStr },
          create: {
            chatId: chatIdStr,
            title: chatTitle,
            type: chatType,
            username: username || null,
            isActive: true,
            isDefault: !existingDefault, // Make default if first integration
          },
          update: {
            title: chatTitle,
            type: chatType,
            username: username || null,
            isActive: true,
          },
        });

        // Delete used pairing code
        await prisma.telegramPairingCode.delete({
          where: { id: pairingCodeRecord.id },
        }).catch(() => {});

        // Send confirmation to Telegram
        await sendTelegramMessage(
          chat.id,
          `<b>Connected to Leads Center CRM</b>
━━━━━━━━━━━━━━━━━━━━
<b>Destination:</b> <b>${chatTitle}</b>
<b>Type:</b> <code>${chatType.toUpperCase()}</code>
<b>Chat ID:</b> <code>${chatIdStr}</code>

Recruiters can now share driver profiles, CDL documents, and application records directly to this chat from the CRM.`,
          { parse_mode: "HTML" }
        );

        return NextResponse.json({ ok: true, paired: true });
      }

      // If user typed /start or /connect without a valid code
      if (text === "/start" || text === "/help" || text === "/connect") {
        await sendTelegramMessage(
          chat.id,
          `<b>Welcome to Leads Center Bot (@${TELEGRAM_BOT_USERNAME})</b>
━━━━━━━━━━━━━━━━━━━━
To connect this chat to your CRM:
1. Open your <b>Leads Center CRM</b>.
2. Click your user profile -> <b>Integrations (Telegram)</b>.
3. Click <b>"Generate Code"</b>.
4. Send the code here (e.g. <code>/connect LC-8492</code>).

<i>Once connected, recruiters can send driver profiles and documents directly into this chat with 1 click.</i>`,
          { parse_mode: "HTML" }
        );
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith("/status")) {
        const integration = await prisma.telegramIntegration.findUnique({
          where: { chatId: chatIdStr },
        });

        if (integration) {
          await sendTelegramMessage(
            chat.id,
            `<b>Leads Center CRM Status: ACTIVE</b>
━━━━━━━━━━━━━━━━━━━━
<b>Destination:</b> ${integration.title}
<b>Type:</b> ${integration.type}
<b>Default Chat:</b> ${integration.isDefault ? "Yes" : "No"}
<b>Connected Since:</b> ${new Date(integration.createdAt).toLocaleDateString()}`,
            { parse_mode: "HTML" }
          );
        } else {
          await sendTelegramMessage(
            chat.id,
            `<b>Not Connected</b>\nSend <code>/connect &lt;CODE&gt;</code> with the pairing code from your Leads Center CRM Integrations menu.`,
            { parse_mode: "HTML" }
          );
        }
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook handler error:", error);
    return NextResponse.json({ ok: true });
  }
}
