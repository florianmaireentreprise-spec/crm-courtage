import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../middleware";

async function handler(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "email query param is required" },
      { status: 400 },
    );
  }

  const client = await prisma.client.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
    },
    select: {
      id: true,
      raisonSociale: true,
      email: true,
      statut: true,
      prenom: true,
      nom: true,
    },
  });

  return NextResponse.json({ client: client ?? null });
}

export const GET = withN8nAuth(handler);
