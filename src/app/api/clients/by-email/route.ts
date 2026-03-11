import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateN8nRequest } from "@/lib/n8n";
import type { ClientByEmailResponse } from "@/lib/types/n8n-integration";

export async function GET(req: Request) {
  if (!validateN8nRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "email query parameter is required" },
      { status: 400 },
    );
  }

  const client = await prisma.client.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
    },
    select: {
      id: true,
      prenom: true,
      nom: true,
      raisonSociale: true,
      statut: true,
    },
  });

  if (!client) {
    return NextResponse.json({ client: null });
  }

  const response: ClientByEmailResponse = {
    client_id: client.id,
    name: `${client.prenom} ${client.nom}`,
    company: client.raisonSociale,
    status: client.statut,
  };

  return NextResponse.json(response);
}
