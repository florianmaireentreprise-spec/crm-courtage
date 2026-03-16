/**
 * Bootstrap Workspaces — Phase 1
 *
 * 1. Creates "demo" and "real" workspaces (idempotent)
 * 2. Migrates ALL existing records (workspaceId = null) to "demo"
 * 3. Sets "real" as the default workspace (isDefault = true)
 *
 * Run: npx tsx scripts/bootstrap-workspaces.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const WORKSPACE_MODELS = [
  "client",
  "dirigeant",
  "contrat",
  "commission",
  "deal",
  "tache",
  "prescripteur",
  "compagnie",
  "document",
  "opportuniteCommerciale",
] as const;

async function main() {
  console.log("=== Bootstrap Workspaces — Phase 1 ===\n");

  // Step 1: Create workspaces (upsert = idempotent)
  const demoWs = await prisma.workspace.upsert({
    where: { slug: "demo" },
    create: { slug: "demo", nom: "Démonstration", isDefault: false },
    update: { nom: "Démonstration", isDefault: false },
  });
  console.log(`✓ Workspace "demo" : ${demoWs.id}`);

  const realWs = await prisma.workspace.upsert({
    where: { slug: "real" },
    create: { slug: "real", nom: "Production", isDefault: true },
    update: { nom: "Production", isDefault: true },
  });
  console.log(`✓ Workspace "real" : ${realWs.id}`);

  // Step 2: Migrate all existing records (workspaceId = null) to "demo"
  console.log("\n--- Migration des données existantes vers 'demo' ---\n");

  for (const model of WORKSPACE_MODELS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (prisma as any)[model];
    const count = await delegate.count({ where: { workspaceId: null } });

    if (count > 0) {
      await delegate.updateMany({
        where: { workspaceId: null },
        data: { workspaceId: demoWs.id },
      });
      console.log(`  ${model}: ${count} enregistrements → demo`);
    } else {
      console.log(`  ${model}: 0 (aucun à migrer)`);
    }
  }

  // Step 3: Summary
  console.log("\n--- Résumé ---\n");
  for (const model of WORKSPACE_MODELS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (prisma as any)[model];
    const demoCount = await delegate.count({ where: { workspaceId: demoWs.id } });
    const realCount = await delegate.count({ where: { workspaceId: realWs.id } });
    const nullCount = await delegate.count({ where: { workspaceId: null } });
    console.log(`  ${model}: demo=${demoCount}, real=${realCount}, null=${nullCount}`);
  }

  console.log("\n✅ Bootstrap terminé. Workspace 'real' est le workspace par défaut.");
  console.log(`   REAL_WORKSPACE_ID = ${realWs.id}`);
  console.log(`   DEMO_WORKSPACE_ID = ${demoWs.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
