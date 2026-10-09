# Examples

Two real pages produced by `prompts/maps-to-landing-master-prompt.md`, kept here
as worked references. Open either file in a browser — no server, no build, no
install.

| File | Business | Category | Language | Sections |
| --- | --- | --- | --- | --- |
| [`frenchy-ain-allah.html`](frenchy-ain-allah.html) | FRENCHY Ain Allah | Dessert café, Dély Ibrahim | French | header, hero, intro, menu, signature, experience, visit, final-cta, footer |
| [`thaisty-crousty.html`](thaisty-crousty.html) | Thaisty Crousty | Bowls / restaurant, Hydra | French | header, hero, trust, menu, story, showcase, reviews, location, final-cta, footer |

They are deliberately different. Different palette, different type pairing,
different section order, different signature device, different section count. A
barbershop, a bakery, a dental clinic and a gym should each look like a different
designer made them — if two outputs of this prompt look alike, the prompt failed.

## What to look at

Both files carry their whole data layer in one block:

```html
<script type="application/json" id="site-data">
```

The markup holds structure and classes only; JS writes the text. Open the block
and you can see exactly what was researched, and exactly what was *not* — which
is the part that matters when you go to sell this to someone.

- `business` — verified facts. Anything unverifiable is `null`, never guessed.
- `content` — the copy, free-form per business.
- `offerings` / `reviews` / `gallery` — repeating records.
- `missing[]` — a plain-language list of what to ask the owner. This is your
  sales checklist.

`thaisty-crousty.html` shows the token-substitution pattern: `"{rating} / 5 sur
Google*"` instead of retyping the number, so the same fact never appears twice
and cannot go stale. Its JSON-LD is generated from the data block too, so the
structured data can't contradict the page.

## Both pass the contract

```bash
node tools/check-contract.mjs "examples/*.html"
```

```
PASS frenchy-ain-allah.html  (6 offerings, 0 reviews, 7 nulls, 4 missing-info notes)
PASS thaisty-crousty.html    (6 offerings, 1 reviews, 6 nulls, 5 missing-info notes)
```

Note that Frenchy has **0 reviews** and a **null rating**. That business had no
verifiable public rating, so the page ships without one and asks the owner for
it. It is the single most important habit in this repo: a fabricated review
count gets you a sale you cannot keep.

## About the data in these files

Names, addresses, phone numbers, prices and opening hours were read from public
listings at the time of writing and belong to those businesses. They are here to
demonstrate the output. Replace them with your own client's data before you ship
anything, and see the note in [`../LICENSE`](../LICENSE).

## Changing an example

`__snapshots__/` holds a frozen render of each page. CI compares the current
render against it, so an accidental change to a headline, a link or an hours row
fails the build instead of shipping silently. If you change an example on
purpose:

```bash
node tools/render-snapshot.mjs examples/thaisty-crousty.html --json \
  > examples/__snapshots__/thaisty-crousty.json
```

Commit the regenerated snapshot in the same commit as the change, so a reviewer
can see exactly what moved.