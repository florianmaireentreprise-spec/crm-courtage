import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// GET /api/opportunities — List opportunities (filterable by clientId, statut)
export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const statut = url.searchParams.get("statut");

  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (statut) where.statut = statut;

  const opportunites = await prisma.opportuniteCommerciale.findMany({
    where,
    orderBy: { derniereActivite: "desc" },
    take: 50,
    include: {
      client: { select: { id: true, raisonSociale: true } },
    },
  });

  return NextResponse.json(opportunites);
}

// PATCH /api/opportunities — Update opportunity status
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, statut, motifRejet, convertieEnDealId } = body as {
    id: string;
    statut?: string;
    motifRejet?: string;
    convertieEnDealId?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const validStatuts = ["detectee", "qualifiee", "en_cours", "convertie", "rejetee", "expiree"];
  if (statut && !validStatuts.includes(statut)) {
    return NextResponse.json({ error: "Invalid statut" }, { status: 400 });
  }

  const opp = await prisma.opportuniteCommerciale.findUnique({ where: { id } });
  if (!opp) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {
    derniereActivite: new Date(),
  };
  if (statut) updateData.statut = statut;
  if (motifRejet) updateData.motifRejet = motifRejet;
  if (convertieEnDealId) updateData.convertieEnDealId = convertieEnDealId;

  const updated = await prisma.opportuniteCommerciale.update({
    where: { id },
    data: updateData,
  });

  revalidatePath(`/clients/${opp.clientId}`);

  return NextResponse.json(updated);
}
