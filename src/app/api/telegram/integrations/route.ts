import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  TELEGRAM_BOT_USERNAME,
  TELEGRAM_BOT_TOKEN,
  sendTelegramMessage,
  getTelegramChat,
  pollAndProcessTelegramUpdates,
} from "@/lib/telegram";

export async function GET() {
  try {
    // Process any incoming messages from Telegram first
    await pollAndProcessTelegramUpdates();

    const integrations = await prisma.telegramIntegration.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      botUsername: TELEGRAM_BOT_USERNAME,
      botTokenConfigured: Boolean(TELEGRAM_BOT_TOKEN),
      integrations,
    });
  } catch (error) {
    console.error("Error fetching telegram integrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. Action: Sync updates from Telegram
    if (action === "sync_updates") {
      const { pairedCount } = await pollAndProcessTelegramUpdates();
      const integrations = await prisma.telegramIntegration.findMany({
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });

      return NextResponse.json({
        pairedCount,
        integrations,
      });
    }

    // 2. Action: Generate Pairing Code
    if (action === "generate_code") {
      // Clean expired codes first
      await prisma.telegramPairingCode.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }).catch(() => {});

      // Generate a 4-digit random number
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const code = `LC-${randomDigits}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

      const pairing = await prisma.telegramPairingCode.create({
        data: {
          code,
          expiresAt,
        },
      });

      return NextResponse.json({
        code: pairing.code,
        expiresAt: pairing.expiresAt,
        botUsername: TELEGRAM_BOT_USERNAME,
        directDeepLink: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${pairing.code}`,
      });
    }

    // 3. Action: Manual Channel / Chat Connection (via @channel_username, User ID, or Chat ID)
    if (action === "manual_connect") {
      const { channelIdentifier, title } = body;
      if (!channelIdentifier) {
        return NextResponse.json(
          { error: "Username or Chat ID is required" },
          { status: 400 }
        );
      }

      const formattedId = channelIdentifier.startsWith("@")
        ? channelIdentifier
        : channelIdentifier.startsWith("-") || !isNaN(Number(channelIdentifier))
        ? channelIdentifier
        : `@${channelIdentifier}`;

      // Verify chat with Telegram API
      const chatInfo = await getTelegramChat(formattedId);
      if (!chatInfo.ok || !chatInfo.result) {
        return NextResponse.json(
          {
            error:
              chatInfo.description ||
              "Could not access Telegram destination. If it's a channel or group, make sure @kargogroups_bot is added as Administrator. If it's a user, send /start to @kargogroups_bot first.",
          },
          { status: 400 }
        );
      }

      const chat = chatInfo.result;
      const chatIdStr = String(chat.id);
      const chatTitle =
        title ||
        chat.title ||
        [chat.first_name, chat.last_name].filter(Boolean).join(" ") ||
        chat.username ||
        `Chat ${chat.id}`;

      const existingDefault = await prisma.telegramIntegration.findFirst({
        where: { isDefault: true },
      });

      const integration = await prisma.telegramIntegration.upsert({
        where: { chatId: chatIdStr },
        create: {
          chatId: chatIdStr,
          title: chatTitle,
          type: chat.type || "channel",
          username: chat.username || undefined,
          isActive: true,
          isDefault: !existingDefault,
        },
        update: {
          title: chatTitle,
          type: chat.type || "channel",
          username: chat.username || undefined,
          isActive: true,
        },
      });

      // Send verification message
      await sendTelegramMessage(
        chat.id,
        `🎉 <b>Connected to Leads Center CRM!</b>\n━━━━━━━━━━━━━━━━━━━━\nThis destination is now connected to receive shared driver leads.`,
        { parse_mode: "HTML" }
      );

      return NextResponse.json({ success: true, integration });
    }

    // 4. Action: Test Ping Message
    if (action === "test_ping") {
      const { chatId } = body;
      if (!chatId) {
        return NextResponse.json({ error: "chatId is required" }, { status: 400 });
      }

      const res = await sendTelegramMessage(
        chatId,
        `🔔 <b>Leads Center CRM Test Notification</b>\n━━━━━━━━━━━━━━━━━━━━\nYour connection to <b>@${TELEGRAM_BOT_USERNAME}</b> is active and working properly!\n🕒 <i>${new Date().toLocaleTimeString()}</i>`,
        { parse_mode: "HTML" }
      );

      if (!res.ok) {
        return NextResponse.json(
          { error: res.description || "Failed to deliver test message to Telegram" },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // 5. Action: Check if code paired
    if (action === "check_code_paired") {
      const { code } = body;
      // Trigger sync
      await pollAndProcessTelegramUpdates();

      const pairing = await prisma.telegramPairingCode.findUnique({
        where: { code },
      });

      return NextResponse.json({ paired: !pairing });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in telegram integrations API:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isDefault, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (isDefault) {
      await prisma.telegramIntegration.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.telegramIntegration.update({
      where: { id },
      data: {
        ...(typeof isDefault === "boolean" ? { isDefault } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating telegram integration:", error);
    return NextResponse.json(
      { error: "Failed to update integration" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.telegramIntegration.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting telegram integration:", error);
    return NextResponse.json(
      { error: "Failed to delete integration" },
      { status: 500 }
    );
  }
}
