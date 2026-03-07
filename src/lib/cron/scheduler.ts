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

// ── Sync emails + IA analysis — every 15 minutes ──
cron.schedule("*/15 * * * *", () => {
  callCron("/api/cron/emails", "Sync emails");
});

// ── Auto-tasks — every day at 7:00 UTC ──
cron.schedule("0 7 * * *", () => {
  callCron("/api/cron/auto-tasks", "Auto-tasks");
});

// ── Sequences — every day at 8:00 UTC ──
cron.schedule("0 8 * * *", () => {
  callCron("/api/cron/sequences", "Sequences");
});

// ── Campagnes — 1st of each month at 9:00 UTC ──
cron.schedule("0 9 1 * *", () => {
  callCron("/api/cron/campagnes", "Campagnes");
});

// ── Rapport hebdo — Monday at 8:00 UTC ──
cron.schedule("0 8 * * 1", () => {
  callCron("/api/cron/rapport-hebdo", "Rapport hebdo");
});

console.log("[CRON] Scheduler initialized — 5 jobs registered (emails: */15min, tasks: 7h, sequences: 8h, campagnes: 1er/mois, rapport: lundi 8h)");
