import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withN8nAuth } from "../../middleware";

async function handler(req: Request) {
  const body = await req.json();
  const { tacheId, raison, emailSortantId } = body as {
    tacheId: string;
    raison: string;
    emailSortantId?: string;
  };

  if (!tacheId) {
    return NextResponse.json({ error: "tacheId is required" }, { status: 400 });
  }

  const tache = await prisma.tache.findUnique({ where: { id: tacheId } });
  if (!tache) {
    return NextResponse.json({ error: "Tache not found" }, { status: 404 });
  }

  if (tache.statut === "terminee") {
    return NextResponse.json({ success: true, alreadyClosed: true });
  }

  await prisma.tache.update({
    where: { id: tacheId },
    data: {
      statut: "terminee",
      dateRealisation: new Date(),
      autoFermee: true,
      raisonFermeture: raison || `Auto-fermée — email sortant${emailSortantId ? ` (${emailSortantId})` : ""}`,
    },
  });

  revalidatePath("/relances");

  return NextResponse.json({ success: true });
}

export const POST = withN8nAuth(handler);
