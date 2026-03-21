import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const nom = params.get("nom")?.trim().toLowerCase() || "";
  const prenom = params.get("prenom")?.trim().toLowerCase() || "";
  const raisonSociale = params.get("raisonSociale")?.trim().toLowerCase() || "";
  const excludeId = params.get("excludeId") || "";

  if (!nom && !raisonSociale) {
    return NextResponse.json({ duplicates: [] });
  }

  // Build OR conditions for lightweight duplicate detection
  const orConditions: Record<string, unknown>[] = [];

  // Match by nom (+ optional prenom)
  if (nom) {
    const nameCondition: Record<string, unknown> = {
      nom: { contains: nom, mode: "insensitive" },
    };
    if (prenom) {
      nameCondition.prenom = { contains: prenom, mode: "insensitive" };
    }
    orConditions.push(nameCondition);
  }

  // Match by raison sociale
  if (raisonSociale && raisonSociale.length >= 3) {
    orConditions.push({
      raisonSociale: { contains: raisonSociale, mode: "insensitive" },
    });
  }

  if (orConditions.length === 0) {
    return NextResponse.json({ duplicates: [] });
  }

  const candidates = await prisma.client.findMany({
    where: {
      OR: orConditions,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: {
      id: true,
      raisonSociale: true,
      prenom: true,
      nom: true,
      email: true,
      ville: true,
      categorieReseau: true,
      rolesReseau: true,
    },
    take: 5,
  });

  return NextResponse.json({ duplicates: candidates });
}
