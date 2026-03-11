import { google, type Auth } from "googleapis";
import type { gmail_v1 } from "googleapis";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

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

function buildRawMime(to: string, subject: string, body: string): string {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
  const messageParts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `MIME-Version: 1.0`,
    "",
    body,
  ];
  return Buffer.from(messageParts.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendGmailReply(
  oauth2Client: Auth.OAuth2Client,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
) {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const raw = buildRawMime(to, `Re: ${subject}`, body);

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw, threadId: threadId || undefined },
  });
}

export async function createGmailDraft(
  oauth2Client: Auth.OAuth2Client,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
): Promise<string> {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const raw = buildRawMime(to, `Re: ${subject}`, body);

  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: { raw, threadId: threadId || undefined },
    },
  });
  return res.data.id!;
}

export async function updateGmailDraft(
  oauth2Client: Auth.OAuth2Client,
  draftId: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
): Promise<string> {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const raw = buildRawMime(to, `Re: ${subject}`, body);

  const res = await gmail.users.drafts.update({
    userId: "me",
    id: draftId,
    requestBody: {
      message: { raw, threadId: threadId || undefined },
    },
  });
  return res.data.id!;
}

export async function sendGmailDraft(
  oauth2Client: Auth.OAuth2Client,
  draftId: string,
): Promise<void> {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  await gmail.users.drafts.send({
    userId: "me",
    requestBody: { id: draftId },
  });
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


// ── Gmail Push Notifications (Pub/Sub) ──

export async function watchGmail(
  oauth2Client: Auth.OAuth2Client,
): Promise<{ historyId: string; expiration: string }> {
  const topicName = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topicName) throw new Error("GMAIL_PUBSUB_TOPIC not configured");

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName,
      labelIds: ["INBOX", "SENT"],
    },
  });

  return {
    historyId: String(res.data.historyId ?? ""),
    expiration: String(res.data.expiration ?? ""),
  };
}

export async function getNewMessageIds(
  oauth2Client: Auth.OAuth2Client,
  startHistoryId: string,
): Promise<{ messageIds: string[]; newHistoryId: string }> {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const messageIds: string[] = [];
  let pageToken: string | undefined;
  let newHistoryId = startHistoryId;

  do {
    const res = await gmail.users.history.list({
      userId: "me",
      startHistoryId,
      historyTypes: ["messageAdded"],
      pageToken,
    });

    if (res.data.history) {
      for (const h of res.data.history) {
        if (h.messagesAdded) {
          for (const m of h.messagesAdded) {
            if (m.message?.id) messageIds.push(m.message.id);
          }
        }
      }
    }

    newHistoryId = String(res.data.historyId ?? startHistoryId);
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return { messageIds: [...new Set(messageIds)], newHistoryId };
}
