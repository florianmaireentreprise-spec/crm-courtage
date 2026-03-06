import { NextResponse } from "next/server";
import { generateAutoTasks } from "@/lib/auto-tasks";

export async function GET(request: Request) {
  // Verification du secret CRON si configure
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const url = new URL(request.url);
    const headerSecret = request.headers.get("x-cron-secret");
    const querySecret = url.searchParams.get("secret");

    if (headerSecret !== cronSecret && querySecret !== cronSecret) {
      return NextResponse.json(
        { error: "Non autorise" },
        { status: 401 }
      );
    }
  }

  try {
    const results = await generateAutoTasks();

    return NextResponse.json({
      success: true,
      results,
      tasksCreated: results.total,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur generation auto-tasks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la generation des taches automatiques",
      },
      { status: 500 }
    );
  }
}
