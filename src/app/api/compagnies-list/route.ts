import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const compagnies = await prisma.compagnie.findMany({
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });
  return NextResponse.json(compagnies);
}
