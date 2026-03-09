import cron from "node-cron";

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const SECRET = process.env.CRON_SECRET;

async function callCron(path: string, label: string) {
  try {
    const url = `${BASE_URL}${path}${SECRET ? `?secret=${SECRET}` : ""}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(`[CRON] ${label} — ${res.status}`, data);
  } catch (err) {
    console.error(`[CRON] ${label} failed:`, err);
  }
}

// ── Sync emails — every 15 minutes ──
// (Gmail sync + n8n webhook emission stay on the CRM side)
cron.schedule("*/15 * * * *", () => {
  callCron("/api/cron/emails", "Sync emails");
});

console.log("[CRON] Scheduler initialized — 1 job registered (emails: */15min). Other automations handled by n8n.");
