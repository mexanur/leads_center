export const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || "7737389966:AAELF5EILnl36aQf-pe80HfVB1CgjOE8xzo";
export const TELEGRAM_BOT_USERNAME =
  process.env.TELEGRAM_BOT_USERNAME || "kargogroups_bot";

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface TelegramChat {
  id: number | string;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramSendMessageResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

/**
 * Send text message to a Telegram Chat (supports HTML parse mode)
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: {
    parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
    disable_web_page_preview?: boolean;
    reply_markup?: any;
  }
): Promise<TelegramSendMessageResponse> {
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parse_mode || "HTML",
        disable_web_page_preview: options?.disable_web_page_preview ?? false,
        reply_markup: options?.reply_markup,
      }),
    });

    return await res.json();
  } catch (error) {
    console.error("Telegram sendMessage error:", error);
    return { ok: false, description: String(error) };
  }
}

/**
 * Send a document/file to a Telegram Chat using a direct file URL
 */
export async function sendTelegramDocument(
  chatId: string | number,
  documentUrl: string,
  caption?: string,
  options?: {
    parse_mode?: "HTML" | "Markdown";
  }
): Promise<TelegramSendMessageResponse> {
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/sendDocument`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        document: documentUrl,
        caption: caption || undefined,
        parse_mode: options?.parse_mode || "HTML",
      }),
    });

    return await res.json();
  } catch (error) {
    console.error("Telegram sendDocument error:", error);
    return { ok: false, description: String(error) };
  }
}

/**
 * Send a photo to a Telegram Chat using a direct photo URL
 */
export async function sendTelegramPhoto(
  chatId: string | number,
  photoUrl: string,
  caption?: string,
  options?: {
    parse_mode?: "HTML" | "Markdown";
  }
): Promise<TelegramSendMessageResponse> {
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption: caption || undefined,
        parse_mode: options?.parse_mode || "HTML",
      }),
    });

    return await res.json();
  } catch (error) {
    console.error("Telegram sendPhoto error:", error);
    return { ok: false, description: String(error) };
  }
}

/**
 * Get information about a Telegram Chat
 */
export async function getTelegramChat(
  chatId: string | number
): Promise<{ ok: boolean; result?: TelegramChat; description?: string }> {
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/getChat?chat_id=${encodeURIComponent(chatId)}`);
    return await res.json();
  } catch (error) {
    console.error("Telegram getChat error:", error);
    return { ok: false, description: String(error) };
  }
}

/**
 * Set Webhook URL for the Telegram Bot
 */
export async function setTelegramWebhook(webhookUrl: string) {
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "channel_post"],
      }),
    });
    return await res.json();
  } catch (error) {
    console.error("Telegram setWebhook error:", error);
    return { ok: false, description: String(error) };
  }
}

/**
 * Format Driver Lead Profile into a rich, structured HTML Telegram message
 */
export function formatLeadTelegramMessage(lead: any): string {
  const cdlLabel = (lead.cdlType || "CLASS_A").replace("_", " ");
  const driverTypeLabel = (lead.driverType || "OTR").replace("_", " ");
  
  let endorsementsList = "None";
  if (lead.endorsements) {
    try {
      const parsed = typeof lead.endorsements === "string" ? JSON.parse(lead.endorsements) : lead.endorsements;
      if (Array.isArray(parsed) && parsed.length > 0) {
        endorsementsList = parsed.join(", ");
      }
    } catch {
      endorsementsList = String(lead.endorsements);
    }
  }

  const stageTitles: Record<string, string> = {
    NEW_LEAD: "🔵 New Lead",
    CONTACTED: "🟡 Contacted",
    APPLICATION_SENT: "🟣 Application Sent",
    DOCS_MVR_REVIEW: "🟠 Docs & MVR Review",
    APPROVED_HIRED: "🟢 Approved & Hired",
    REJECTED_ARCHIVED: "⚪ Rejected / Archived",
  };

  const statusTitle = stageTitles[lead.status] || lead.status;
  const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, "") : "";

  let latestNoteHtml = "";
  if (lead.notes && lead.notes.length > 0) {
    const note = lead.notes[0];
    const tag = note.tag ? `[${note.tag}] ` : "";
    latestNoteHtml = `\n\n📝 <b>Latest Note:</b>\n<i>"${tag}${escapeHtml(note.content)}"</i>`;
  }

  return `🚛 <b>DRIVER LEAD PROFILE</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Full Name:</b> <b>${escapeHtml(lead.fullName)}</b>
📞 <b>Phone:</b> <code>${escapeHtml(lead.phone)}</code> ${cleanPhone ? `(<a href="tel:${cleanPhone}">Call</a> • <a href="https://wa.me/${cleanPhone}">WhatsApp</a>)` : ""}
${lead.email ? `📧 <b>Email:</b> <code>${escapeHtml(lead.email)}</code>\n` : ""}${lead.locationState ? `📍 <b>State:</b> ${escapeHtml(lead.locationState)}\n` : ""}
📋 <b>Qualifications:</b>
• <b>CDL Class:</b> ${escapeHtml(cdlLabel)}
• <b>Experience:</b> ${lead.experienceYears || 0} Years
• <b>Route Type:</b> ${escapeHtml(driverTypeLabel)}
${lead.desiredPay ? `• <b>Desired Pay:</b> ${escapeHtml(lead.desiredPay)}\n` : ""}• <b>Endorsements:</b> ${escapeHtml(endorsementsList)}

📊 <b>Pipeline Stage:</b> ${statusTitle}
🌐 <b>Source:</b> ${escapeHtml(lead.source || "OTHER")}${lead.sourceDetails ? ` (${escapeHtml(lead.sourceDetails)})` : ""}
${lead.assignedTo?.name ? `👤 <b>Recruiter:</b> ${escapeHtml(lead.assignedTo.name)}\n` : ""}${latestNoteHtml}
━━━━━━━━━━━━━━━━━━━━
<i>Shared from Leads Center CRM</i>`;
}

function escapeHtml(text: string): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
