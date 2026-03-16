import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const demoWs = await p.workspace.findFirst({ where: { slug: "demo" } });
  const realWs = await p.workspace.findFirst({ where: { slug: "real" } });
  console.log("Demo WS:", demoWs?.id);
  console.log("Real WS:", realWs?.id);

  const demoClients = await p.client.findMany({
    where: { workspaceId: demoWs?.id },
    select: { id: true, raisonSociale: true },
  });
  console.log("\nDemo clients:", demoClients.length);
  const demoClientIds = demoClients.map((c) => c.id);

  // Emails linked to demo clients
  const emailsWithDemoClient = await p.email.findMany({
    where: { clientId: { in: demoClientIds } },
    select: { id: true, sujet: true, clientId: true, analyseStatut: true },
  });
  console.log("\nEmails linked to demo clients:", emailsWithDemoClient.length);
  emailsWithDemoClient.forEach((e) => {
    const cn = demoClients.find((c) => c.id === e.clientId)?.raisonSociale;
    console.log("  -", (e.sujet || "").substring(0, 60), "->", cn, "[" + e.analyseStatut + "]");
  });

  // Signals linked to demo clients
  const sc = await p.signalCommercial.count({ where: { clientId: { in: demoClientIds } } });
  console.log("\nSignalCommercial linked to demo clients:", sc);

  // Pending analysis emails with demo clientId
  const pe = await p.email.count({
    where: { clientId: { in: demoClientIds }, analyseStatut: "non_analyse" },
  });
  console.log("Pending analysis emails with demo clientId:", pe);

  // Total emails
  const te = await p.email.count();
  const ec = await p.email.count({ where: { clientId: { not: null } } });
  console.log("\nTotal emails:", te, "| With clientId:", ec);

  // Taches in real workspace linked to demo clients
  const tr = await p.tache.count({
    where: { clientId: { in: demoClientIds }, workspaceId: realWs?.id },
  });
  console.log("Real-workspace taches linked to demo clients:", tr);
}

main().catch(console.error).finally(() => p.$disconnect());
