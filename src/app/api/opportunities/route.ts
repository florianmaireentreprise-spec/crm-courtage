import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// -- Lifecycle transition rules --
const VALID_TRANSITIONS: Record<string, string[]> = {
  detectee: ["qualifiee", "en_cours", "rejetee"],
  qualifiee: ["en_cours", "rejetee"],
  en_cours: ["gagnee", "perdue", "rejetee"],
  // Terminal states — no outbound transitions
  gagnee: [],
  perdue: [],
  rejetee: [],
  // Legacy statuses — allow closing only
  convertie: ["gagnee"],
  expiree: [],
};

const TERMINAL_STATUSES = ["gagnee", "perdue", "rejetee", "convertie", "expiree"];

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

// PATCH /api/opportunities — Update opportunity status with lifecycle validation
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, statut, motifRejet, closeReason, convertieEnDealId } = body as {
    id: string;
    statut?: string;
    motifRejet?: string;
    closeReason?: string;
    convertieEnDealId?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const opp = await prisma.opportuniteCommerciale.findUnique({ where: { id } });
  if (!opp) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }

  // Validate transition
  if (statut) {
    const allowed = VALID_TRANSITIONS[opp.statut];
    if (!allowed) {
      return NextResponse.json(
        { error: `Statut actuel "${opp.statut}" ne permet aucune transition` },
        { status: 400 },
      );
    }
    if (!allowed.includes(statut)) {
      return NextResponse.json(
        { error: `Transition "${opp.statut}" → "${statut}" non autorisee. Transitions possibles: ${allowed.join(", ") || "aucune"}` },
        { status: 400 },
      );
    }
  }

  const updateData: Record<string, unknown> = {
    derniereActivite: new Date(),
  };

  if (statut) {
    updateData.statut = statut;

    // Set closedAt on terminal transitions
    if (TERMINAL_STATUSES.includes(statut) && !opp.closedAt) {
      updateData.closedAt = new Date();
    }

    // Store close reason
    const reason = closeReason || motifRejet;
    if (reason) {
      updateData.closeReason = reason;
      // Keep motifRejet in sync for backward compat
      if (statut === "rejetee") {
        updateData.motifRejet = reason;
      }
    }
  }

  if (convertieEnDealId) updateData.convertieEnDealId = convertieEnDealId;

  const updated = await prisma.opportuniteCommerciale.update({
    where: { id },
    data: updateData,
  });

  revalidatePath(`/clients/${opp.clientId}`);

  return NextResponse.json(updated);
}
