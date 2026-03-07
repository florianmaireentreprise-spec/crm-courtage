import { NextResponse } from "next/server";
import { genererRapportHebdo } from "@/lib/automation/rapport-hebdo";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const url = new URL(request.url);
    const headerSecret = request.headers.get("x-cron-secret");
    const querySecret = url.searchParams.get("secret");

    if (headerSecret !== cronSecret && querySecret !== cronSecret) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }
  }

  try {
    const rapport = await genererRapportHebdo();

    return NextResponse.json({
      success: true,
      rapport,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur generation rapport hebdo:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la generation du rapport" },
      { status: 500 }
    );
  }
}
