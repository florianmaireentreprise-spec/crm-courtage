/**
 * Fix: Unlink emails from demo-workspace clients
 *
 * Sets clientId = null on emails that reference clients in the demo workspace.
 * This prevents demo client names from appearing in the email inbox.
 *
 * Run: npx tsx scripts/fix-email-demo-links.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Fix Email → Demo Client Links ===\n");

  // 1. Get demo workspace
  const demoWs = await prisma.workspace.findFirst({ where: { slug: "demo" } });
  if (!demoWs) {
    console.log("No demo workspace found. Nothing to fix.");
    return;
  }

  // 2. Get all demo client IDs
  const demoClients = await prisma.client.findMany({
    where: { workspaceId: demoWs.id },
    select: { id: true, raisonSociale: true },
  });
  const demoClientIds = demoClients.map((c) => c.id);

  if (demoClientIds.length === 0) {
    console.log("No demo clients found. Nothing to fix.");
    return;
  }

  // 3. Find emails linked to demo clients
  const affectedEmails = await prisma.email.findMany({
    where: { clientId: { in: demoClientIds } },
    select: { id: true, sujet: true, clientId: true },
  });

  console.log(`Found ${affectedEmails.length} emails linked to demo clients:\n`);
  affectedEmails.forEach((e) => {
    const clientName = demoClients.find((c) => c.id === e.clientId)?.raisonSociale;
    console.log(`  - "${e.sujet?.substring(0, 60)}" → ${clientName}`);
  });

  if (affectedEmails.length === 0) {
    console.log("\nNo emails to fix. Already clean.");
    return;
  }

  // 4. Unlink: set clientId = null
  const result = await prisma.email.updateMany({
    where: { clientId: { in: demoClientIds } },
    data: { clientId: null },
  });

  console.log(`\n✅ Unlinked ${result.count} emails from demo clients.`);
  console.log("   These emails remain in the inbox but are no longer associated with demo data.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
