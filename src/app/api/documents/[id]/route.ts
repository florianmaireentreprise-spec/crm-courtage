import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

// PATCH /api/documents/[id] — Update metadata or archive
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const {
      nomAffiche,
      categorie,
      typeDocument,
      notes,
      archive,
      dateDocument,
      dateExpiration,
      contratId,
      opportuniteId,
      dealId,
    } = body;

    const document = await prisma.document.update({
      where: { id },
      data: {
        ...(nomAffiche !== undefined ? { nomAffiche } : {}),
        ...(categorie !== undefined ? { categorie } : {}),
        ...(typeDocument !== undefined ? { typeDocument } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(archive !== undefined ? { archive } : {}),
        ...(dateDocument !== undefined
          ? { dateDocument: dateDocument ? new Date(dateDocument) : null }
          : {}),
        ...(dateExpiration !== undefined
          ? { dateExpiration: dateExpiration ? new Date(dateExpiration) : null }
          : {}),
        ...(contratId !== undefined ? { contratId: contratId || null } : {}),
        ...(opportuniteId !== undefined ? { opportuniteId: opportuniteId || null } : {}),
        ...(dealId !== undefined ? { dealId: dealId || null } : {}),
      },
    });

    return NextResponse.json({ document });
  } catch (error) {
    console.error("[documents/update] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour" },
      { status: 500 },
    );
  }
}

// DELETE /api/documents/[id] — Delete document + blob
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }

    // Delete from Vercel Blob
    await del(document.storageUrl);

    // Delete from database
    await prisma.document.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[documents/delete] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 },
    );
  }
}
