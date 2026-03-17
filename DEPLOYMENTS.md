# Deployments — CRM Courtage

## Two Environments

| | Real (Production) | Demo |
|---|---|---|
| **Purpose** | Day-to-day cabinet work | Demos, screenshots, safe testing |
| **Vercel project** | `crm-courtage` | `demo-crm-courtage` |
| **Branch** | `main` | `demo` |
| **Database** | Neon `main` branch | Neon `demo` branch (separate data) |
| **Gmail/n8n** | Live (OAuth2, 9 workflows) | Disabled (empty env vars) |
| **Vercel Blob** | Live (document storage) | Disabled |
| **Login** | Real credentials | `demo@gargarine.fr` / `demo123` |
| **Demo banner** | No | Yes (amber banner via `NEXT_PUBLIC_DEMO_MODE=true`) |

## Source of Truth

**`main` branch is the source of truth for all real work.** All development happens on `main`. The `demo` branch receives explicit promotions from `main` when the demo environment needs to be updated.

## Branch Model

```
main  ──────────────────────────────── (real/production deploys here)
  \
   └── demo  ───────────────────────── (demo deploys here, promoted from main)
```

- `main` → auto-deploys to production Vercel project
- `demo` → auto-deploys to demo Vercel project
- Demo is NOT an automatic mirror of main

## Vercel Dashboard Configuration

### Real project (`crm-courtage`)
- Git branch: `main`
- Production branch: `main`
- All env vars set (DATABASE_URL, Gmail OAuth, n8n secrets, Blob token, etc.)

### Demo project (`demo-crm-courtage`)
- Git branch: `demo`
- Production branch: `demo`
- Env vars: see `.env.demo.example` — Gmail, n8n, Blob all disabled via empty values
- `NEXT_PUBLIC_DEMO_MODE=true`

**Important Vercel setting**: The demo project must be configured to deploy from the `demo` branch, NOT from `main`. If the demo project still tracks `main`, change it in: Vercel Dashboard → demo project → Settings → Git → Production Branch → set to `demo`.

## How to Promote main → demo

When you want the demo environment to reflect current production code:

```bash
# 1. Make sure main is up to date
git checkout main
git pull origin main

# 2. Switch to demo branch and merge
git checkout demo
git merge main

# 3. Push (triggers Vercel auto-deploy for demo)
git push origin demo

# 4. Switch back to main for normal work
git checkout main
```

If the demo branch does not exist yet:

```bash
git checkout main
git checkout -b demo
git push -u origin demo
```

Then configure the demo Vercel project to deploy from `demo` (see Vercel settings above).

## Pre-Promotion Checklist

Before merging main into demo:

1. **Build passes**: `npm run build` succeeds on main (no TS errors)
2. **Schema compatibility**: If Prisma schema changed since last demo promotion, the demo DB must be synced:
   ```bash
   # Point at the demo database
   DATABASE_URL=<demo-neon-pooler-url> DIRECT_URL=<demo-neon-direct-url> npx prisma db push
   ```
3. **Seed data**: If new required fields were added, re-seed demo data:
   ```bash
   DIRECT_URL=<demo-neon-direct-url> npx tsx scripts/seed-demo.ts
   ```
4. **No real secrets in demo env**: Demo env vars must have Gmail/n8n/Blob empty (see `.env.demo.example`)

## What to Do If Demo Breaks

Demo failures do NOT affect production. Triage calmly:

1. **Check Vercel build logs** for the demo project
2. **Most common cause**: Prisma schema drift — the demo DB schema is behind the codebase
   - Fix: run `npx prisma db push` against the demo DB (see Pre-Promotion Checklist)
3. **Seed data issues**: New required fields or relations not present in demo seed
   - Fix: re-run `npx tsx scripts/seed-demo.ts` against demo DB
4. **Env var issues**: Missing or misconfigured env vars in demo Vercel project
   - Fix: compare demo Vercel env vars against `.env.demo.example`
5. **If all else fails**: The demo project can be redeployed from any known-good state of the `demo` branch. Production is completely isolated.

## Demo Schema Sync

Demo uses a more pragmatic schema-sync workflow than production:

- **Production**: Schema changes are tested before pushing to main. `npx prisma db push` runs against the real Neon DB during development.
- **Demo**: Schema changes accumulate on main. The demo DB only needs to be synced when promoting to demo. This is intentional — demo is not a continuous deployment target.

`npx prisma db push` is safe for both environments because the project does not use Prisma migrations (by design — single-user internal tool).

## Safety Rules

1. **Never apply demo shortcuts to production** — demo has disabled integrations and fake data. Production has real Gmail, real n8n, real client data.
2. **Never seed demo data into the real database** — the seed script must ONLY run against the demo Neon branch.
3. **Never push directly to `demo` branch** — always merge from `main` to keep demo as a subset of production code.
4. **Never configure the real Vercel project to deploy from `demo`** — real always deploys from `main`.

## Incident Log

### March 2026 — Demo deployment failure
- **Cause**: Demo DB schema drifted from Prisma schema after multiple main-branch schema changes were not promoted to demo
- **Impact**: Demo Vercel deployment failed (Prisma generate/build error). Production was NOT affected
- **Fix**: Synced demo DB schema with `npx prisma db push` against demo Neon branch, then redeployed
- **Prevention**: Pre-promotion checklist now includes schema sync step (see above)

## Related Files

| File | Purpose |
|---|---|
| `.env.demo.example` | Template for demo environment variables |
| `scripts/seed-demo.ts` | Seeds demo database with realistic fake data |
| `scripts/bootstrap-workspaces.ts` | Creates demo+real workspace rows, migrates existing data to demo |
| `scripts/check-contamination.ts` | Audits for cross-workspace data leaks |
| `scripts/fix-email-demo-links.ts` | Unlinks emails that referenced demo clients |
| `CLAUDE.md` | Full technical reference (architecture, models, conventions) |
