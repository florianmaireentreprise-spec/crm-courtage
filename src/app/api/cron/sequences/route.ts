import { NextResponse } from "next/server";
import { processSequences } from "@/lib/automation/sequences";

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
    const results = await processSequences();

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur traitement sequences:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors du traitement des sequences" },
      { status: 500 }
    );
  }
}
