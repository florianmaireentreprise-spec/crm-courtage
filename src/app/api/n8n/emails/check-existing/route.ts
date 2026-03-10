import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../middleware";

async function handler(req: Request) {
  const body = await req.json();
  const { gmailIds } = body as { gmailIds: string[] };

  if (!Array.isArray(gmailIds) || gmailIds.length === 0) {
    return NextResponse.json({ error: "gmailIds array is required" }, { status: 400 });
  }

  const existing = await prisma.email.findMany({
    where: { gmailId: { in: gmailIds } },
    select: { gmailId: true },
  });

  const existingSet = new Set(existing.map((e) => e.gmailId));
  const newIds = gmailIds.filter((id) => !existingSet.has(id));
  const existingIds = gmailIds.filter((id) => existingSet.has(id));

  return NextResponse.json({ newIds, existingIds });
}

export const POST = withN8nAuth(handler);
