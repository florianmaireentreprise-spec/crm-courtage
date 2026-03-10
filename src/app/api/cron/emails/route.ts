import { NextResponse } from "next/server";

// Gmail sync is now handled by n8n WF07 (Schedule every 15 minutes)
// This cron endpoint is deprecated.

export async function GET() {
  return NextResponse.json({
    success: false,
    message: "Email sync is now handled by n8n WF07. This endpoint is deprecated.",
  });
}
