import { NextResponse } from "next/server";
import { syncAllUsersEmails } from "@/lib/email/sync";

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
    const results = await syncAllUsersEmails();

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur cron sync emails:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la synchronisation emails" },
      { status: 500 }
    );
  }
}
