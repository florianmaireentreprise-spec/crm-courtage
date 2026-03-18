/**
 * One-off migration script: Reseau taxonomy cleanup
 *
 * typeRelation mapping:
 *   prescripteur_potentiel → prescripteur
 *   influenceur → prescripteur
 *   autre → client_potentiel_direct
 *   (client_potentiel_direct, partenaire, ancien_client remain as-is)
 *
 * statutReseau mapping:
 *   identifie → aucune_demarche
 *   contacte → premier_echange
 *   echange_fait → premier_echange
 *   client → actif
 *   prescripteur_actif → actif
 *   (a_qualifier, a_contacter, suivi_en_cours, sans_suite remain as-is)
 *
 * Run: npx tsx scripts/migrate-reseau-taxonomy.ts
 * Safe to run multiple times (idempotent — only updates rows with old values).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TYPE_RELATION_MAP: Record<string, string> = {
  prescripteur_potentiel: "prescripteur",
  influenceur: "prescripteur",
  autre: "client_potentiel_direct",
};

const STATUT_RESEAU_MAP: Record<string, string> = {
  identifie: "aucune_demarche",
  contacte: "premier_echange",
  echange_fait: "premier_echange",
  client: "actif",
  prescripteur_actif: "actif",
};

async function main() {
  console.log("=== Reseau taxonomy migration ===\n");

  // 1. Migrate typeRelation
  for (const [oldVal, newVal] of Object.entries(TYPE_RELATION_MAP)) {
    const result = await prisma.client.updateMany({
      where: { typeRelation: oldVal },
      data: { typeRelation: newVal },
    });
    if (result.count > 0) {
      console.log(`typeRelation: ${oldVal} → ${newVal} (${result.count} rows)`);
    }
  }

  // 2. Migrate statutReseau
  for (const [oldVal, newVal] of Object.entries(STATUT_RESEAU_MAP)) {
    const result = await prisma.client.updateMany({
      where: { statutReseau: oldVal },
      data: { statutReseau: newVal },
    });
    if (result.count > 0) {
      console.log(`statutReseau: ${oldVal} → ${newVal} (${result.count} rows)`);
    }
  }

  // 3. Verify: check for any remaining old values
  const oldTypeValues = Object.keys(TYPE_RELATION_MAP);
  const oldStatutValues = Object.keys(STATUT_RESEAU_MAP);

  const remainingTypes = await prisma.client.count({
    where: { typeRelation: { in: oldTypeValues } },
  });
  const remainingStatuts = await prisma.client.count({
    where: { statutReseau: { in: oldStatutValues } },
  });

  console.log("\n=== Verification ===");
  console.log(`Remaining old typeRelation values: ${remainingTypes}`);
  console.log(`Remaining old statutReseau values: ${remainingStatuts}`);

  if (remainingTypes === 0 && remainingStatuts === 0) {
    console.log("\n✓ Migration complete — all values updated.");
  } else {
    console.log("\n⚠ Some old values remain — check manually.");
  }

  // 4. Summary: current distribution
  const typeDistribution = await prisma.client.groupBy({
    by: ["typeRelation"],
    where: { typeRelation: { not: null } },
    _count: true,
  });
  const statutDistribution = await prisma.client.groupBy({
    by: ["statutReseau"],
    where: { statutReseau: { not: null } },
    _count: true,
  });

  console.log("\n=== Current distribution ===");
  console.log("typeRelation:", typeDistribution.map((r) => `${r.typeRelation}: ${r._count}`).join(", ") || "(none)");
  console.log("statutReseau:", statutDistribution.map((r) => `${r.statutReseau}: ${r._count}`).join(", ") || "(none)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
