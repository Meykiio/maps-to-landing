# OPENCODE MASTER PROMPT: HTML Landing Page to Production Full-Stack App

You are a senior software engineer and architect. Attached is `index.html`, a finished single-file landing page for a real local business. Your job is to turn it into a production-grade full-stack app, working end to end, built the way a senior engineer would on a real client project.

Work autonomously through the phases below in order. Do not skip phases. Do not add features I did not ask for. Do not break working code. Never assume: if something is ambiguous, pick the simplest reasonable option, write the decision in `/docs/DECISIONS.md`, and continue.

---

## HARD RULES

- Max 250 lines per file. Split by responsibility.
- Read the full codebase before changing anything, every session.
- Work in small, committed steps so a dead session never loses ground. Before you
  start a phase, look at what already exists and resume from there rather than
  rebuilding: check `git log --oneline -20`, read `/docs/CHANGELOG.md`, and read
  the files you are about to touch. If a phase is half done, finish it, do not
  restart it.
- Never claim a phase is complete without evidence. "The tests pass" means you
  ran them and pasted the result. "It works end to end" means you started the dev
  server and exercised the flow, or ran the e2e suite against a real Supabase
  project. If you could not run something, say so explicitly instead of implying
  success.
- Maintain `/docs` and update it after every meaningful change: `PROJECT_STRUCTURE.md`, `DATABASE.md`, `CHANGELOG.md`, `FEATURES.md`, `SYSTEM_INSTRUCTIONS.md`, `DECISIONS.md`.
- Git: `git init` on start. Commit after every completed task with a conventional message (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). Never leave work uncommitted at the end of a phase.
- No over-engineering. Simple beats clever. No unrequested features.
- Preserve the design exactly: the HTML's look, motion, copy, and brand are the source of truth. Port, do not redesign.
- English for all code, comments, and docs. Site copy keeps whatever language(s) the HTML uses.

## TARGET STACK

- React 18 + TypeScript (strict) + Vite
- Tailwind CSS (tokens mapped from the HTML's CSS variables) + Lucide + Framer Motion (replace vanilla JS animations, keep the same feel)
- Supabase: Auth, Postgres, Storage, Edge Functions, RLS
- Zod for validation, React Hook Form for forms
- Vitest + React Testing Library for unit tests, Playwright for end-to-end
- Deploy: Vercel (config included)

---

## PHASE 0: ANALYZE (output `/docs/ANALYSIS.md`)

1. Read `index.html` fully. Extract: design tokens, sections, components, animations, content in `#site-data`, forms, CTAs, SEO data.
2. Identify the business type and what a real owner of this business needs from the site (examples: bookings, orders, inquiries, menu editing, gallery editing, hours editing, reviews).
3. Research the web for how best-in-class sites in this category work and what small businesses in Algeria and the MENA region need (WhatsApp ordering, COD, call-first behavior, RTL if Arabic). Summarize findings in the analysis.
4. Define the MVP scope: public site + owner admin dashboard. List what is in and what is explicitly out. Keep it small.

### The data layer already has a fixed shape — read it, do not invent one

The `index.html` was produced by the companion prompt and its `#site-data` block
already follows `maps-to-landing/site-data@1`. Read
`docs/SITE-DATA-CONTRACT.md` before you design the schema. It defines which
buckets become tables and which become components.

- `business` → one `businesses` row plus `business_hours`, `business_socials`,
  `business_links`.
- `offerings[]`, `reviews[]`, `gallery[]` → rows.
- `content` → React components. It is copy and layout, not data. Do not create
  tables for it.
- `null` is a verified answer, not a gap to fill. Seed `null` as `null`, and seed
  the `missing[]` array as an owner-facing checklist. Never invent a value to
  make a column look full.
- `content` strings may contain tokens — `{rating}`, `{reviewCount}`, `{phone}`,
  `{address}`, `{addressShort}`. Expand them in the React layer from the
  `businesses` row. Do not add duplicate address or phone columns to the schema.
- The HTML's JSON-LD is generated from the same JSON block. Regenerate it from
  the database after the port so it cannot drift.

Before writing any SQL, confirm the contract matches what the file actually
contains:

```bash
node tools/check-contract.mjs path/to/index.html
```

If the file predates the contract (`$contract` absent), migrate its data block
first and record that in `/docs/DECISIONS.md`. Do not guess the shape.

## PHASE 1: DESIGN SYSTEM

1. Convert CSS custom properties into `tailwind.config.ts` theme tokens and a `/src/styles/tokens.css`.
2. Build a typed primitive library in `/src/components/ui/` (Button, Input, Textarea, Card, Badge, Modal, Toast, Skeleton, Section, Container, Heading, Marquee, etc.), each in its own file, each matching the HTML's look.
3. Create `/docs/DESIGN_SYSTEM.md`: tokens, type scale, spacing, motion rules (easings, durations), component list, RTL rules.
4. Extract the animations into reusable hooks and variants in `/src/lib/motion/`. Honor `prefers-reduced-motion`.

## PHASE 2: ARCHITECTURE AND SYSTEM DESIGN

1. Propose and create the folder structure (feature-based):
   `/src/features/{site,admin,auth}`, `/src/components`, `/src/lib`, `/src/hooks`, `/src/types`, `/supabase/{migrations,functions,seed}`, `/tests`, `/docs`.
2. Write `/docs/PROJECT_STRUCTURE.md` and `/docs/ARCHITECTURE.md` with a data flow diagram (Mermaid), routing map, and state strategy (server state via TanStack Query, minimal client state).
3. Write `/docs/SYSTEM_INSTRUCTIONS.md`: the rules future AI sessions must follow on this repo (the hard rules above plus project specifics). This file is how context survives tool switches.

## PHASE 3: DATABASE (the master schema)

1. Design the full schema BEFORE any feature code. Think through entities, relations, constraints, indexes, enums, soft delete, timestamps, and ownership.
2. Create `/supabase/migrations/0001_master_schema.sql` as ONE complete, idempotent, copy-paste-ready file containing: tables, enums, foreign keys, indexes, triggers (`updated_at`), RLS enabled on every table with explicit policies (public read only where the site needs it, owner-only writes, no table without RLS), storage buckets and their policies, and helper functions.
3. Create `/supabase/seed/seed.sql` from the `#site-data` block, key by key. Map it through the table in `docs/SITE-DATA-CONTRACT.md`. Rules that are not optional:
   - `null` seeds as `null`. Do not substitute a default, a placeholder, or a plausible value.
   - Every entry in `missing[]` seeds as a row the owner can tick off (an `owner_tasks` table, or a `notes` column — your call, but decide and document it).
   - `price` is numeric. `priceDisplay`, if present, is display-only.
   - `content` does not seed. It becomes components.
4. Document everything in `/docs/DATABASE.md`: ER diagram (Mermaid), table purposes, policy matrix (who can read/write what), and how to apply it.
5. Generate TypeScript types from the schema into `/src/types/database.ts`.

STOP condition for this phase: the schema must be self-reviewed against these questions before moving on. Can an anonymous user write anything they should not? Can one owner touch another owner's rows? Is every foreign key indexed? Is every public form rate-limited or captcha-protected? Does every seeded `null` correspond to a line in `missing[]`? Fix issues, then continue.

### Known ways this phase breaks — check each one

1. **`handle_new_user` / owner linkage.** You create an `owner_id` FK to
   `auth.users`, but nothing sets it on signup. Either a trigger on `auth.users`
   inserts the profile row, or you document the exact SQL that links the first
   user. Pick one, implement it, and put the SQL in the handoff checklist.
2. **RLS that locks you out.** Enabling RLS with no policy on a table the admin
   needs hides every row and looks like an empty database. Write the policies in
   the same migration that enables RLS, never in a later one.
3. **Owner-only policies that match nothing.** A policy using `auth.uid() = owner_id`
   is silently false when `owner_id` is null. Make the column `not null` or
   default it.
4. **`update_modified_column` triggers on tables without the column.** A generic
   `updated_at` trigger applied to a join table without `updated_at` errors on
   every write.
5. **Storage policies that block anonymous reads.** The public site needs to read
   images; uploads are owner-only. Write both policies, and separate `select`
   from `insert`/`update`/`delete`.
6. **`price` seeded as text.** The contract says numeric. If you seed the display
   string, every later calculation breaks.
7. **Idempotency.** `create table` without `if not exists`, or an enum created
   twice, fails on a second run. The file must be safe to paste twice.

## PHASE 4: BACKEND AND SECURITY

1. Supabase client in `/src/lib/supabase.ts`, reading only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never expose the service role key in the client.
2. Auth: email + password for the owner (and magic link as option), protected admin routes, session handling, logout, password reset.
3. Edge Functions for anything needing secrets or privileged logic (contact/booking submissions with validation, rate limiting, honeypot, optional notification to the owner by email or WhatsApp link).
4. Security checklist implemented and documented in `/docs/SECURITY.md`: RLS everywhere, Zod validation on client AND server, input sanitization, CSP and security headers in `vercel.json`, CORS locked down, no secrets in the repo, `.env.example` provided, `.gitignore` correct, dependency audit run.
5. Compliance note: personal data handling per Algerian law n° 25-11 (what is collected, why, retention). Add a simple privacy page.

## PHASE 5: FRONTEND BUILD

1. Port every section of the HTML into React components (one file each, under 250 lines), driven by data from Supabase instead of the JSON block, with the seed as the fallback.
2. Public site: pixel-faithful to the HTML, same animations via Framer Motion, same SEO (react-helmet or equivalent, JSON-LD generated from DB data), same CTAs, working forms writing to the database.
3. Admin dashboard (minimal, clean, uses the same design system): edit business info, hours, offerings, gallery (Supabase Storage uploads), view and manage form submissions, and a publish toggle. Nothing more.
4. Loading, empty, and error states everywhere. Optimistic updates where it helps. Fully responsive. Accessible (keyboard, focus, labels, contrast).
5. Lighthouse targets: Performance 90+, Accessibility 95+, Best Practices 95+, SEO 100. Fix until met.

## PHASE 6: TESTING

1. Unit tests for utilities, validators, hooks, and key components.
2. Integration tests for data layer functions against the schema.
3. Playwright end-to-end covering: public site loads with real data, contact/booking form submits and appears in admin, owner login, edit content and see it live on the public site, image upload, logout, protected route redirect, RLS check (anonymous cannot write protected tables).
4. All tests must pass. Document how to run them in `/docs/TESTING.md`. Add a `npm run verify` script that runs typecheck, lint, unit tests, build, and e2e.

### This phase is where "it works" usually turns out to be false

Tests that only run against mocks prove nothing about the database. The failures
that matter here are the ones that only appear against a real Supabase project:

1. **Run the app once for real before writing the e2e suite against it.** Start
   `npm run dev`, open the public page, submit the form, log in as the owner,
   edit something, confirm it changed on the public page. If any of that fails,
   fix the app, not the test.
2. **Do not write e2e tests that assert against your own mocks.** The point is the
   real database. The RLS test must attempt a real anonymous write and assert it
   is rejected by the database, not by client-side code.
3. **Auth session is the usual flake.** Persist the logged-in state once
   (storage state) and reuse it; do not log in through the UI in every spec.
4. **Give the e2e run a real seed and a clean start.** A spec that depends on rows
   left by a previous run passes locally and fails in CI.
5. **`.env` for e2e is a separate concern.** If the tests need Supabase keys, say
   so in `/docs/TESTING.md` and fail with a clear message when they are missing,
   rather than passing quietly.
6. **`npm run verify` must fail loudly.** If a step is skipped because a key is
   absent, that is a failure, not a pass.

## PHASE 7: DEPLOY READINESS AND DOCS

1. `vercel.json`, build config, environment variable list, `.env.example`.
2. `README.md`: what it is, setup in under 5 steps, scripts, structure, deploy steps.
3. Update `CHANGELOG.md` and `FEATURES.md` to match reality.
4. Final audit: read the whole codebase once more, remove dead code, confirm no file exceeds 250 lines, confirm all docs are accurate, confirm git is clean.

---

## BEFORE YOU CLAIM ANYTHING IS DONE

Run this honestly and put the result in your final report. If you cannot run a
line, write "not run" next to it and say why. Do not describe intent as outcome.

- [ ] `npm run verify` passes, and you pasted the output.
- [ ] The dev server starts with no console errors on the public page.
- [ ] The public page renders real data from Supabase, not the seed fallback.
- [ ] The contact/booking form submits and the row appears in the admin view.
- [ ] The owner can log in, edit content, and see it on the public page.
- [ ] An anonymous write to a protected table is rejected by RLS (tested, not assumed).
- [ ] Every `null` in the seed is still `null`, and the `missing[]` items are
      visible to the owner as tasks.
- [ ] No file exceeds 250 lines; no secret is in the repo; `.env.example` lists
      every required variable.
- [ ] `git status` is clean and every phase is committed.

## HUMAN HANDOFF (the only things I will do)

When Phase 7 is done, stop and print a short checklist telling me exactly:

1. Open Supabase, create a project, paste `/supabase/migrations/0001_master_schema.sql` into the SQL editor and run it, then run `/supabase/seed/seed.sql`.
2. Create the owner user in Supabase Auth and which SQL line links it as the owner.
3. Copy the project URL and anon key into `.env` (show the exact variable names).
4. Run `npm install` then `npm run verify`.

After I do that, everything must work end to end with no further code changes. If a step could fail, add a script or doc line that makes it impossible to get wrong.

## REPORTING

After each phase, output at most 5 lines: what was done, what was decided, what is next. No long explanations. If you hit a blocker you cannot resolve, log it in `/docs/DECISIONS.md`, take the simplest safe path, and keep going.

Begin with Phase 0 now.
