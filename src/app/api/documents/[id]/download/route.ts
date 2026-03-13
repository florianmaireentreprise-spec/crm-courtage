import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { get } from "@vercel/blob";

// GET /api/documents/[id]/download — Stream private blob to client
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }

    // Fetch private blob content — SDK returns { stream, blob, statusCode }
    const blobResult = await get(document.storageUrl, { access: "private" });
    if (!blobResult || blobResult.statusCode === 304 || !blobResult.stream) {
      return NextResponse.json({ error: "Fichier introuvable dans le storage" }, { status: 404 });
    }

    // Stream the blob to the client with appropriate headers
    const headers = new Headers();
    headers.set("Content-Type", blobResult.blob.contentType || document.mimeType);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(document.nomAffiche || document.nomFichier)}"`,
    );
    if (blobResult.blob.size) {
      headers.set("Content-Length", String(blobResult.blob.size));
    }

    return new Response(blobResult.stream, { headers });
  } catch (error) {
    console.error("[documents/download] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors du telechargement" },
      { status: 500 },
    );
  }
}
