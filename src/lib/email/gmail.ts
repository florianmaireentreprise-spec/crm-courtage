import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";

export function buildOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/gmail/callback`
  );
}

export function extractBodyText(payload: gmail_v1.Schema$MessagePart): string {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, "base64url").toString("utf-8");
    return decoded.slice(0, 500);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractBodyText(part);
      if (text) return text;
    }
  }

  if (payload.mimeType === "text/html" && payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, "base64url").toString("utf-8");
    return decoded
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
  }

  return "";
}

export function parseGmailMessage(msg: gmail_v1.Schema$Message) {
  const headers = msg.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

  const sujet = getHeader("Subject") || "(Sans objet)";
  const expediteur = getHeader("From");
  const toHeader = getHeader("To");
  const dateHeader = getHeader("Date");

  const destinataires = toHeader
    ? toHeader.split(",").map((s) => s.trim())
    : [];

  const dateEnvoi = dateHeader ? new Date(dateHeader) : new Date();
  const extrait = msg.payload ? extractBodyText(msg.payload) : null;

  return {
    gmailId: msg.id ?? "",
    threadId: msg.threadId ?? "",
    sujet,
    expediteur,
    destinataires: JSON.stringify(destinataires),
    dateEnvoi: isNaN(dateEnvoi.getTime()) ? new Date() : dateEnvoi,
    extrait: extrait || null,
  };
}
