import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withN8nAuth } from "../middleware";

async function handler(req: Request) {
  const body = await req.json();

  const { scores } = body as {
    scores: Array<{
      clientId: string;
      scoreProspect?: number;
      potentielCA?: number;
    }>;
  };

  if (!Array.isArray(scores) || scores.length === 0) {
    return NextResponse.json(
      { error: "scores array is required" },
      { status: 400 },
    );
  }

  let updated = 0;
  for (const score of scores) {
    try {
      // Store scoring data in client notes since no dedicated fields exist yet
      const client = await prisma.client.findUnique({
        where: { id: score.clientId },
        select: { noteEmails: true },
      });
      if (!client) continue;

      const date = new Date().toISOString().slice(0, 10);
      const existing = client.noteEmails ?? "";
      const lines = existing.split("\n").filter(Boolean);
      // Remove previous scoring notes
      const filtered = lines.filter((l) => !l.includes("[Scoring]"));
      filtered.push(
        `[Scoring ${date}] Score: ${score.scoreProspect ?? "N/A"} | Potentiel CA: ${score.potentielCA ?? "N/A"}€`,
      );
      await prisma.client.update({
        where: { id: score.clientId },
        data: { noteEmails: filtered.slice(-10).join("\n") },
      });
      updated++;
    } catch {
      // Skip individual failures
    }
  }

  revalidatePath("/clients");
  revalidatePath("/");

  return NextResponse.json({ success: true, updated, total: scores.length });
}

export const POST = withN8nAuth(handler);
