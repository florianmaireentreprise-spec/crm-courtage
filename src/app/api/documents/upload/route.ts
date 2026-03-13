import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

// Max file size: 10 MB
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const clientId = formData.get("clientId") as string | null;
    const categorie = formData.get("categorie") as string | null;
    const typeDocument = formData.get("typeDocument") as string | null;

    if (!file || !clientId || !categorie || !typeDocument) {
      return NextResponse.json(
        { error: "Champs requis: file, clientId, categorie, typeDocument" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 10 Mo)" },
        { status: 400 },
      );
    }

    // Optional fields
    const nomAffiche = (formData.get("nomAffiche") as string) || file.name;
    const source = (formData.get("source") as string) || "upload_manuel";
    const notes = formData.get("notes") as string | null;
    const dateDocument = formData.get("dateDocument") as string | null;
    const dateExpiration = formData.get("dateExpiration") as string | null;
    const contratId = formData.get("contratId") as string | null;
    const opportuniteId = formData.get("opportuniteId") as string | null;
    const dealId = formData.get("dealId") as string | null;

    // Upload to Vercel Blob (private)
    const pathname = `documents/${clientId}/${Date.now()}-${file.name}`;
    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type || "application/octet-stream",
    });

    // Persist metadata in PostgreSQL
    const document = await prisma.document.create({
      data: {
        clientId,
        contratId: contratId || undefined,
        opportuniteId: opportuniteId || undefined,
        dealId: dealId || undefined,
        nomFichier: file.name,
        nomAffiche,
        categorie,
        typeDocument,
        source,
        mimeType: file.type || "application/octet-stream",
        tailleOctets: file.size,
        storageKey: blob.pathname,
        storageUrl: blob.url,
        dateDocument: dateDocument ? new Date(dateDocument) : undefined,
        dateExpiration: dateExpiration ? new Date(dateExpiration) : undefined,
        notes: notes || undefined,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("[documents/upload] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'upload du document" },
      { status: 500 },
    );
  }
}
