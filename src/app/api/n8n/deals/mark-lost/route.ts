import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../middleware";

async function handler(req: Request) {
  const body = await req.json();
  const { clientId, dealId, motif } = body as {
    clientId?: string;
    dealId?: string;
    motif?: string;
  };

  if (!clientId && !dealId) {
    return NextResponse.json(
      { error: "clientId or dealId is required" },
      { status: 400 },
    );
  }

  const motifPerte = motif ?? "Pas de reponse (sequence auto)";
  let dealsUpdated = 0;

  if (dealId) {
    await prisma.deal.update({
      where: { id: dealId },
      data: {
        etape: "PERDU",
        motifPerte,
        dateClosingReel: new Date(),
      },
    });
    dealsUpdated = 1;
  } else if (clientId) {
    const dealsOuverts = await prisma.deal.findMany({
      where: {
        clientId,
        etape: {
          notIn: ["SIGNATURE", "ONBOARDING", "DEVELOPPEMENT", "PERDU"],
        },
      },
    });

    for (const deal of dealsOuverts) {
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          etape: "PERDU",
          motifPerte,
          dateClosingReel: new Date(),
        },
      });
    }
    dealsUpdated = dealsOuverts.length;
  }

  return NextResponse.json({ success: true, dealsUpdated });
}

export const POST = withN8nAuth(handler);
