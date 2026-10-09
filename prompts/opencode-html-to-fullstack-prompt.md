# OPENCODE MASTER PROMPT: HTML Landing Page to Production Full-Stack App

You are a senior software engineer and architect. Attached is `index.html`, a finished single-file landing page for a real local business. Your job is to turn it into something that business can actually run, or that a developer can sell to that business.

That is the only goal. Not a portfolio demo, and not an enterprise system for a bakery. It has to work, be secure, be maintainable, and be the right size for this business. Speed matters, but it never buys cutting correctness or security.

Work autonomously through the phases below in order. Do not add features I did not ask for. Do not break working code. Never assume: if something is ambiguous, pick the smallest reasonable option, write the decision and the reason in `/docs/DECISIONS.md`, and continue.

---

## HARD RULES

- Max 250 lines per file. Split by responsibility.
- Do not skip phases, except where the right-size decision in Phase 0 says a phase does not apply to this build. When a phase does not apply, say so in the report instead of silently dropping it.
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
- Supabase (Auth, Postgres, Storage, Edge Functions, RLS) only if the chosen tier needs a backend. See the right-size decision in Phase 0.
- Zod for validation, React Hook Form for forms
- Vitest + React Testing Library for unit tests, Playwright for end-to-end
- Deploy: Vercel (config included)

## WORKING METHOD (applies to every phase below)

Work in small, verifiable sprints, not one sweep. This is not optional, and it is
what makes the difference between a build that survives and one that collapses
halfway.

1. **Research before building.** Read the existing code and docs first. Then
   research the current external facts: current library versions, current API
   shapes, official documentation. Do not rely on training knowledge for versions
   and APIs, it is frequently wrong. Use the official docs, or Context7 if it is
   available.
2. **Sprint Research Gate before every sprint**, scaled to the sprint's size. Two
   passes:
   - Codebase: re-read the files, flows, schema and tests this sprint touches.
     Look for an existing pattern to reuse before writing a new one. Confirm the
     previous sprint is committed and the tree is clean.
   - Web: current versions, changelogs, breaking changes, and anything that could
     make this sprint faster, safer or simpler (a library, a platform feature, an
     existing open-source implementation). The point is to find what you do not
     already know exists.
   Never skip this because the sprint looks easy. A copy change gets a light pass,
   a new system gets a deep one.
3. **Write a short Sprint Research Brief** before coding, about 10 lines:
   findings, what you adopted and rejected with a one-line reason each, risks, and
   any change to the acceptance criteria.
4. **Plan, then validate the plan** against the real codebase before executing it.
5. **Execute only the current sprint.** Smallest correct change. No unrelated
   refactors, no speculative features, no new dependency without a stated reason.
6. **Verify with evidence.** Automated checks plus a real run of the user flow. A
   failing gate blocks the commit. Never disable a check to make it pass.
7. **Document what actually shipped**, not what was intended.
8. **Report.** After each phase, at most 5 lines: what was done, what was decided,
   what is next.

If research contradicts the plan: stop, update the plan, revalidate, then
continue. Never silently change the architecture mid-build.

---

## PHASE 0: ANALYZE (output `/docs/ANALYSIS.md`)

1. Read `index.html` fully. Extract: design tokens, sections, components, animations, content in `#site-data`, forms, CTAs, SEO data.
2. Identify the business type and what a real owner of this business needs from the site (examples: bookings, orders, inquiries, menu editing, gallery editing, hours editing, reviews).
3. Research the web for how best-in-class sites in this category work and what small businesses in Algeria and the MENA region need (WhatsApp ordering, COD, call-first behavior, RTL if Arabic). Summarize findings in the analysis.
4. Define the scope: what is in and what is explicitly out. Keep it small. The
   next section decides how small.

### Right-size the build (decide this before you design anything)

Not every landing page needs a database. Decide the smallest architecture that
actually serves this business, and write the choice and the reason in
`/docs/DECISIONS.md`. Do not build for a hypothetical future.

**Tier A, static site.** The page, plus a contact or booking form that writes to
a single table or sends an email. No auth, no admin, no storage. Correct for a
single-location business whose owner will never log in to edit anything.

**Tier B, site plus owner admin.** Tier A plus Supabase Auth for one owner, an
admin view to edit business info, hours, offerings and gallery, and storage for
images. Correct when the owner will maintain the content themselves.

**Tier C, full app.** Tier B plus the domain logic the business actually runs on:
bookings with real availability, orders, a queue, multiple locations. Only when
the business needs it today.

Rules:
- Default to the lowest tier that meets the need. State which tier you chose, why,
  and what would move it up.
- If this is a landing page for a service with no self-service, Tier A is the
  correct answer. Adding Supabase auth and RLS to it is over-engineering and a
  worse deliverable, not a more professional one.
- The counter-argument is real: if the owner has no way to edit content, the site
  goes stale within a month. Weigh that honestly, then decide.
- Whatever tier you pick ships secure, with server-side validation, error
  handling, loading and empty states, and it is documented.
- If my instruction names a tier, that wins over your judgement.

Then: the phases that follow are written for a full build. For a Tier A build,
Phases 3 and 4 largely do not apply. Say so explicitly in your report rather than
silently skipping them.

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

   Component sources you may use here, because this app is React plus Tailwind plus Framer Motion, so importing is legitimate in a way it was not for the HTML: ui.aceternity.com and reactbits.dev for motion-heavy pieces, 21st.dev/community/components and smoothui.dev for layout and form patterns, morphicons.com and amicro.vercel.app/buttons for micro-interactions. Read a component before adopting it, they are untrusted code, and adapt it to the design tokens rather than letting stock styling override the brand.
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

## QUALITY GATES (propose, then use what fits)

Pick the gates that match this build's size and risk, record the choice and the
reason in `/docs/DECISIONS.md`, and wire the ones you keep into a single command so
they run together. Do not install a tool you cannot explain the purpose of.

**Local, before every commit.** Aim for one command, under two minutes:
- TypeScript strict typecheck
- ESLint with `max-lines` set to 250, which enforces the file-size rule for you
- knip, for dead code and unused dependencies
- Vitest plus React Testing Library
- gitleaks, for committed secrets, ideally also as a pre-commit hook
- production build

**Before launch.** In CI if the repo has it, otherwise run once and paste the output:
- Playwright end-to-end, with axe-core accessibility assertions
- Semgrep CE, static analysis
- Trivy, dependencies and secrets
- Lighthouse CI, performance, accessibility and SEO
- Supabase security and performance advisors after every schema change

**Right-sized for a Tier A or B build**, the honest minimum is typecheck, lint,
build, gitleaks, and Playwright with axe over the one or two real user flows. A
restaurant site does not need a load test. Say that in DECISIONS.md instead of
adding tools to look thorough. Adding a gate you will not read is worse than not
having it, because it creates the impression of verification.

**Optional, only when the situation calls for it:**
- Context7 MCP, so you read current library docs instead of guessing APIs
- Playwright MCP, so you can verify the real page in a browser
- k6, only if real traffic is expected
- OWASP ZAP, against a staging URL only, never against anything else
- Sentry, and Dependabot or Renovate, after launch

## BEFORE YOU CLAIM ANYTHING IS DONE

Run this honestly and put the result in your final report. If you cannot run a
line, write "not run" next to it and say why. Do not describe intent as outcome.

- [ ] `npm run verify` passes, and you pasted the output.
- [ ] The dev server starts with no console errors on the public page.
- [ ] The tier you chose is still the right one for this business, and `/docs/DECISIONS.md` says why.
- [ ] The contact or booking form submits, and the submission is actually stored or delivered, not just "handled".
- [ ] Tier B and C only: the public page renders real data from the database, not the seed fallback.
- [ ] Tier B and C only: the owner can log in, edit content, and see it on the public page.
- [ ] Tier B and C only: an anonymous write to a protected table is rejected by RLS, tested against the real database, not assumed.
- [ ] Every `null` is still `null`, and the `missing[]` items are visible to the owner as tasks.
- [ ] No file exceeds 250 lines; no secret is in the repo; `.env.example` lists every required variable.
- [ ] `git status` is clean, and every phase is committed.
- [ ] Your report states which phases did not apply to this build, and why.

## HUMAN HANDOFF (the only things I will do)

When Phase 7 is done, stop and print a short checklist telling me exactly what to
do by hand. Keep it to what actually applies to the tier you built:

1. Tier B and C: open Supabase, create a project, paste `/supabase/migrations/0001_master_schema.sql` into the SQL editor and run it, then run `/supabase/seed/seed.sql`.
2. Tier B and C: create the owner user in Supabase Auth, and name the exact SQL line that links it as the owner.
3. Copy the project URL and anon key into `.env`, showing the exact variable names. Tier A: only if a form endpoint needs them.
4. Run `npm install` then `npm run verify`.
5. Tier A: nothing else. The site is a static build plus a form; say where the form writes to.

After I do that, everything must work end to end with no further code changes. If
a step could fail, add a script or a doc line that makes it impossible to get wrong.

## REPORTING

After each phase, output at most 5 lines: what was done, what was decided, what is next. No long explanations. If you hit a blocker you cannot resolve, log it in `/docs/DECISIONS.md`, take the simplest safe path, and keep going.

Begin with Phase 0 now.
