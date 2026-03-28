-- Migration: PotentielBaseAssumption — populate dual commission rates from old single rate
--
-- PROCEDURE:
-- 1. Run `npx prisma db push` first (adds new columns, makes old ones nullable)
-- 2. Run this SQL to migrate data
-- 3. Verify everything works
-- 4. Later: remove commissionRate + isRecurring from schema, run db push again
--
-- Safe to run multiple times (idempotent — only writes where target is NULL).

-- Migrate isRecurring=true rows → recurringCommissionRate
UPDATE "PotentielBaseAssumption"
SET "recurringCommissionRate" = "commissionRate"
WHERE "isRecurring" = true
  AND "recurringCommissionRate" IS NULL
  AND "commissionRate" IS NOT NULL;

-- Migrate isRecurring=false rows → upfrontCommissionRate
UPDATE "PotentielBaseAssumption"
SET "upfrontCommissionRate" = "commissionRate"
WHERE "isRecurring" = false
  AND "upfrontCommissionRate" IS NULL
  AND "commissionRate" IS NOT NULL;
