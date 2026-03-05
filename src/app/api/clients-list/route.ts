import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const clients = await prisma.client.findMany({
    select: { id: true, raisonSociale: true },
    orderBy: { raisonSociale: "asc" },
  });
  return NextResponse.json(clients);
}
