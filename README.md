# maps-to-landing

Two master prompts. A Google Maps link goes in, an award-level landing page comes
out. That page goes into the second prompt, and a production full-stack app comes
out.

No API keys. No scraping script. No template. You paste a link and read the brief.

```
Google Maps link
      │
      ▼
prompts/maps-to-landing-master-prompt.md      →  index.html  (one file, HTML/CSS/JS)
      │
      ▼
prompts/opencode-html-to-fullstack-prompt.md  →  full-stack app (React + Supabase)
```

---

## Step 1 — Maps link to landing page

Paste the Maps link of a real business into Claude and paste
[`prompts/maps-to-landing-master-prompt.md`](prompts/maps-to-landing-master-prompt.md)
along with it. Replace `[PASTE LINK HERE]` with the link.

The prompt researches the business, writes a short brand brief, and outputs one
complete `index.html`.

**What makes the output worth selling:**

- It reads the business before it designs. Palette and type come from the real
  brand or are derived from the category, the neighbourhood and the photos.
- Every section is different per business. Barbershop, bakery, clinic, gym — four
  different designers, not four reskins.
- **It will not invent facts.** No fake reviews, prices, awards or "since 1985".
  What it could not verify becomes `null`, plus a plain-language line in a
  `missing[]` list. That list is your sales checklist — you walk in knowing
  exactly what to ask the owner.

Two worked examples are in [`examples/`](examples/). Open them.

## Step 2 — HTML to full-stack app

Hand the same `index.html` to opencode with
[`prompts/opencode-html-to-fullstack-prompt.md`](prompts/opencode-html-to-fullstack-prompt.md).

Eight phases: analysis, design system, architecture, the master schema, security,
build, tests, deploy. Design system, project structure, the database, the auth
model, the tests and the docs — the way you would actually build it for a client.

At the end it stops and prints the only four manual steps you need: run one SQL
file in Supabase, create the owner account, paste two keys into `.env`, run
`npm run verify`. After that it works end to end.

---

## The part that makes step 2 work

This is the reason this repository exists, and it is worth understanding before
you use it.

Step 1 and step 2 are two different agents. Step 2 cannot ask you what your data
looks like, and if the shape of the `#site-data` block is left to step 1's
discretion, step 2 has to reverse-engineer it every single time. That is where
this pipeline breaks: it produces a beautiful page, then a schema that quietly
does not match it.

So the shape is not free. Both prompts are bound to one documented contract:

**[`docs/SITE-DATA-CONTRACT.md`](docs/SITE-DATA-CONTRACT.md)** — version
`maps-to-landing/site-data@1`.

It splits content into three buckets, and that split is the whole idea:

| Bucket | What it is | Where it goes in step 2 |
| --- | --- | --- |
| `business` | Verified facts about the real business | Database rows |
| `offerings`, `reviews`, `gallery` | Repeating records | Database rows |
| `content` | Copy and layout — the personality | React components |

`content` is free-form per business, because that is where the design lives.
Everything else has a fixed shape, so the schema can be written without guessing.

Two more rules fall out of it:

- **Never invent.** Unknown is `null`. `null` is a real answer that maps to a
  `nullable` column; a plausible fabrication is a defect, because the owner will
  spot it.
- **Say a fact once.** A rating that appears in three places is three chances to
  go stale the moment the owner edits the database. Store it under `business` and
  substitute `{rating}`, `{reviewCount}`, `{phone}`, `{address}`,
  `{addressShort}`.

## Check it yourself

Both examples are validated in CI, and you can run the same checks:

```bash
node tools/check-contract.mjs "examples/*.html"
```

```
PASS frenchy-ain-allah.html  (6 offerings, 0 reviews, 7 nulls, 4 missing-info notes)
PASS thaisty-crousty.html    (6 offerings, 1 reviews, 6 nulls, 5 missing-info notes)
```

There is also a render harness. It executes each page's own script against a
stubbed DOM with a frozen clock, and records everything the script writes — every
string, link, and class. Diffing two snapshots proves a refactor changed nothing:

```bash
node tools/render-snapshot.mjs examples/thaisty-crousty.html --json
```

It is what let the examples be moved onto the contract with a guarantee of zero
visual change, and it is why CI catches an accidental edit to a headline. It has
no dependencies.

---

## Repository layout

```
prompts/
  maps-to-landing-master-prompt.md        step 1 — Maps link to landing page
  opencode-html-to-fullstack-prompt.md    step 2 — landing page to full-stack app
docs/
  SITE-DATA-CONTRACT.md                   the contract that binds the two prompts
examples/
  frenchy-ain-allah.html                  worked example — dessert café
  thaisty-crousty.html                    worked example — bowls
  __snapshots__/                          frozen renders, checked by CI
tools/
  check-contract.mjs                      validate a page against the contract
  render-snapshot.mjs                     deterministic render + regression diff
.github/workflows/validate.yml            runs both on every push
```

---

## Honest limitations

- **Prompt 1 needs a model that can browse.** If the agent cannot read the Maps
  link, paste the business name and city next to it. That is the most common
  failure and it is not the prompt's fault.
- **No photographs.** Nothing is hotlinked. Visuals are CSS and SVG art with
  clear drop-in slots, because inventing an image is inventing a fact. Photos
  are the owner's to supply, and asking for them is part of the sale.
- **Single-file HTML only.** No frameworks, no build step, nothing to install.
  You can hand the file to an owner on a USB stick and it opens.
- **Algerian and MENA businesses first.** WhatsApp and phone are treated as
  first-class calls to action, RTL is handled properly for Arabic, and Prompt 2
  covers law n° 25-11 on personal data. The prompts still work elsewhere; the
  defaults are just not aimed there.
- **Prompt 2 has not been run end to end yet.** It carries a list of the ways
  phases 3 and 6 are known to break, and it is required to prove its own work
  before reporting done, but its output has not been executed against a live
  Supabase project in this repository. Treat it as a strong starting point, not
  a verified build. Prompt 1's output *is* verified — both examples are in
  `examples/` and checked on every push.

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md). If you add or change an example, CI
will tell you what your change did to the rendered page.

## Licence

MIT — see [`LICENSE`](LICENSE). Use it on client work, remix it, sell the result.
The business data inside `examples/` stays the property of those businesses.