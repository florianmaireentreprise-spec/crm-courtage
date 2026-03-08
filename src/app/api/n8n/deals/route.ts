import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withN8nAuth } from "../middleware";

async function handler(req: Request) {
  const body = await req.json();

  const { dealId, etapeSuggeree, raison, emailId } = body as {
    dealId: string;
    etapeSuggeree: string;
    raison: string;
    emailId?: string;
  };

  if (!dealId || !etapeSuggeree) {
    return NextResponse.json(
      { error: "dealId and etapeSuggeree are required" },
      { status: 400 },
    );
  }

  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Store as suggestion — managers validate in the UI
  await prisma.deal.update({
    where: { id: dealId },
    data: {
      notes: [
        deal.notes,
        `[n8n ${new Date().toISOString().slice(0, 10)}] Suggestion: ${etapeSuggeree} — ${raison}`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  });

  // Also store in related email if provided
  if (emailId) {
    await prisma.email.update({
      where: { id: emailId },
      data: {
        dealUpdateSuggestion: JSON.stringify({
          etapeSuggeree,
          raison,
          emailId,
          suggereeAt: new Date().toISOString(),
        }),
      },
    });
  }

  revalidatePath("/pipeline");

  return NextResponse.json({ success: true, dealId });
}

export const POST = withN8nAuth(handler);
