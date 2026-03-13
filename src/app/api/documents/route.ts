import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/documents?clientId=xxx — List documents for a client
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json(
      { error: "clientId requis" },
      { status: 400 },
    );
  }

  const showArchived = searchParams.get("archive") === "true";
  const categorie = searchParams.get("categorie");

  const documents = await prisma.document.findMany({
    where: {
      clientId,
      archive: showArchived ? undefined : false,
      ...(categorie ? { categorie } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
}
