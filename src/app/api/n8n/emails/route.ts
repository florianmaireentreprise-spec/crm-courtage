import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withN8nAuth } from "../middleware";
import { matchClientByEmail, extractEmailAddress } from "@/lib/email/sync";
import { buildOAuth2Client, createGmailDraft } from "@/lib/email/gmail";
import { extraireSignauxCommerciaux, mettreAJourMemoireCommerciale } from "@/lib/scoring/signals";
import { detecterOpportunitesDepuisEmail } from "@/lib/opportunities/detection";

// POST /api/n8n/emails — Store analysis result from n8n WF05v2
async function handler(req: Request) {
  const body = await req.json();
  const { emailId } = body as { emailId: string };

  if (!emailId) {
    return NextResponse.json({ error: "emailId is required" }, { status: 400 });
  }

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const {
    type, urgence: rawUrgence, resume, sentiment, actionRequise, actionSuggeree,
    draftReply, clientMatch, produitsMentionnes, expediteurNom,
    expediteurEntreprise, contratMentionne, notes, actions,
    // Alternative field names from n8n / AI analysis
    priority, urgencyScore, summary, replySuggestion, suggestedTask,
    intent, productsDetected, senderName, senderCompany,
  } = body as {
    type?: string; urgence?: string; resume?: string; sentiment?: string;
    actionRequise?: boolean; actionSuggeree?: string; draftReply?: string;
    clientMatch?: { found: boolean; clientId?: string; clientName?: string; confidence?: string };
    produitsMentionnes?: string[]; expediteurNom?: string;
    expediteurEntreprise?: string; contratMentionne?: string;
    notes?: string; actions?: Array<{ type: string; titre: string; priorite?: string; details?: string }>;
    // Alternative fields
    priority?: string; urgencyScore?: number; summary?: string;
    replySuggestion?: string; suggestedTask?: string; intent?: string;
    productsDetected?: string[]; senderName?: string; senderCompany?: string;
  };

  // Normalize: accept urgence, priority, or urgencyScore (0-10 mapped to level)
  const urgence = rawUrgence
    ?? (urgencyScore !== undefined
      ? (urgencyScore >= 7 ? "haute" : urgencyScore >= 4 ? "normale" : "basse")
      : priority ?? null);

  // Normalize: merge alternative field names
  const resolvedResume = resume ?? summary ?? null;
  const resolvedType = type ?? intent ?? null;
  const resolvedReply = draftReply ?? replySuggestion ?? null;
  const actionsArr = Array.isArray(actions) ? actions : [];
  const resolvedAction = actionSuggeree ?? suggestedTask ?? (actionsArr[0]?.titre || null);
  const resolvedProducts = produitsMentionnes ?? productsDetected ?? null;
  const resolvedSenderName = expediteurNom ?? senderName ?? null;
  const resolvedSenderCompany = expediteurEntreprise ?? senderCompany ?? null;

  // Determine if action is required (from flag or urgency/task heuristic)
  const resolvedActionRequise = actionRequise ?? !!(
    resolvedAction || actionsArr.length > 0 || (urgencyScore !== undefined && urgencyScore >= 7)
  );

  let resolvedClientId = email.clientId;
  if (clientMatch?.clientId) {
    resolvedClientId = clientMatch.clientId;
  } else if (!resolvedClientId) {
    resolvedClientId = await matchClientByEmail(email.expediteur);
  }

  const updateData: Record<string, unknown> = {
    resume: resolvedResume,
    typeEmail: resolvedType,
    urgence: urgence ?? null,
    sentiment: sentiment ?? null,
    actionRequise: resolvedActionRequise,
    actionTraitee: false,
    reponseProposee: resolvedReply,
    analyseStatut: "analyse",
    clientId: resolvedClientId,
    analyseIA: JSON.stringify(body),
    produitsMentionnes: resolvedProducts?.length ? JSON.stringify(resolvedProducts) : null,
    actionsItems: resolvedAction ? JSON.stringify([resolvedAction]) : null,
  };

  // Phase 3: Auto-create Gmail draft for commercial emails with draftReply
  const isCommercial = resolvedType && ["client", "prospect", "prescripteur"].includes(resolvedType);
  if (resolvedReply && isCommercial && email.direction === "entrant") {
    try {
      const connection = await prisma.gmailConnection.findUnique({
        where: { userId: email.userId },
      });
      if (connection) {
        const oauth2Client = buildOAuth2Client();
        oauth2Client.setCredentials({
          access_token: connection.accessToken,
          refresh_token: connection.refreshToken,
          expiry_date: connection.tokenExpiry.getTime(),
        });
        const toAddress = extractEmailAddress(email.expediteur);
        const draftId = await createGmailDraft(
          oauth2Client, toAddress, email.sujet, draftReply, email.threadId,
        );
        updateData.gmailDraftId = draftId;
        updateData.draftStatut = "brouillon";
      }
    } catch (err) {
      console.error("[n8n/emails] Auto-draft creation error:", err);
      // Non-blocking: don't fail the analysis storage
    }
  }

  await prisma.email.update({
    where: { id: emailId },
    data: updateData,
  });

  if (resolvedClientId) {
    // Update interaction date + accumulate resumeIA
    const clientForResume = await prisma.client.findUnique({
      where: { id: resolvedClientId },
      select: { resumeIA: true },
    });

    const newInsights: string[] = [];
    if (resolvedProducts?.length) newInsights.push("Produits: " + resolvedProducts.join(", "));
    if (resolvedResume) newInsights.push(resolvedResume.slice(0, 200));
    if (notes) newInsights.push("Note: " + String(notes).slice(0, 100));

    let updatedResumeIA = clientForResume?.resumeIA || "";
    if (newInsights.length > 0) {
      const dateStr = new Date().toLocaleDateString("fr-FR");
      const entry = "[" + dateStr + "] " + newInsights.join(" | ");
      updatedResumeIA = updatedResumeIA
        ? entry + "\n" + updatedResumeIA
        : entry;
      // FIFO: keep under 2000 chars
      if (updatedResumeIA.length > 2000) {
        updatedResumeIA = updatedResumeIA.slice(0, 2000);
        const lastNewline = updatedResumeIA.lastIndexOf("\n");
        if (lastNewline > 0) updatedResumeIA = updatedResumeIA.slice(0, lastNewline);
      }
    }

    await prisma.client.update({
      where: { id: resolvedClientId },
      data: {
        derniereInteraction: new Date(),
        ...(newInsights.length > 0 ? { resumeIA: updatedResumeIA } : {}),
      },
    });

    // Stage 2: Extract and persist commercial signals
    try {
      const signals = extraireSignauxCommerciaux({
        produitsMentionnes: resolvedProducts,
        sentiment: sentiment ?? null,
        urgence: urgence ?? null,
        notes: notes ?? null,
        actions: actionsArr,
        dealUpdate: body.dealUpdate ?? null,
        type: resolvedType,
      });
      if (signals.length > 0) {
        await mettreAJourMemoireCommerciale(resolvedClientId, emailId, signals);
      }
    } catch (err) {
      console.error("[n8n/emails] Signal extraction error:", err);
    }

    // Stage 3: Detect and persist commercial opportunities
    try {
      const signals = extraireSignauxCommerciaux({
        produitsMentionnes: resolvedProducts,
        sentiment: sentiment ?? null,
        urgence: urgence ?? null,
        notes: notes ?? null,
        actions: actionsArr,
        dealUpdate: body.dealUpdate ?? null,
        type: resolvedType,
      });
      await detecterOpportunitesDepuisEmail({
        clientId: resolvedClientId,
        emailId,
        signals,
        emailAnalysis: {
          type: resolvedType,
          sentiment: sentiment ?? null,
          urgence: urgence ?? null,
          resume: resolvedResume,
          produitsMentionnes: resolvedProducts,
          notes: notes ?? null,
          actions: actionsArr,
        },
      });
    } catch (err) {
      console.error("[n8n/emails] Opportunity detection error:", err);
      // Non-blocking: don't fail the email pipeline
    }
  }

  // Phase 4: Auto-create "Répondre" task for inbound commercial emails
  if (isCommercial && email.direction === "entrant") {
    try {
      // Anti-doublon: check no existing reply task for this email
      const existingTask = await prisma.tache.findFirst({
        where: { emailId, sourceAuto: "email_reponse_attendue", statut: { in: ["a_faire", "en_cours"] } },
      });
      if (!existingTask) {
        const taskSenderName = resolvedSenderName || email.expediteur.split("@")[0];
        const senderEmail = extractEmailAddress(email.expediteur);
        const ECHEANCE_JOURS: Record<string, number> = { haute: 1, normale: 3, basse: 7 };
        const jours = ECHEANCE_JOURS[urgence ?? "normale"] ?? 3;

        await prisma.tache.create({
          data: {
            titre: `Répondre à ${taskSenderName} (${senderEmail})`,
            description: `Email: "${email.sujet}"`,
            type: "RELANCE_PROSPECT",
            priorite: urgence === "haute" ? "haute" : "normale",
            dateEcheance: new Date(Date.now() + jours * 24 * 60 * 60 * 1000),
            clientId: resolvedClientId,
            emailId,
            autoGenerated: true,
            sourceAuto: "email_reponse_attendue",
          },
        });
      }
    } catch (err) {
      console.error("[n8n/emails] Auto-task creation error:", err);
    }
  }

  revalidatePath("/emails");
  revalidatePath("/emails/urgent");
  revalidatePath("/relances");
  revalidatePath("/clients");
  revalidatePath("/");

  return NextResponse.json({
    success: true,
    emailId,
    clientId: resolvedClientId,
    type: resolvedType ?? "autre",
    urgence: urgence ?? "normale",
    actionRequise: resolvedActionRequise,
    expediteurNom: resolvedSenderName,
    draftReply: resolvedReply,
  });
}

export const POST = withN8nAuth(handler);
