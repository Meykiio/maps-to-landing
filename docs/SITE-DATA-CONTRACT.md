# The `#site-data` contract

**Version:** `maps-to-landing/site-data@1`

Every page produced by `prompts/maps-to-landing-master-prompt.md` carries all of its
content in one `<script type="application/json" id="site-data">` block. This document
is the stable interface between the two prompts.

It exists because the landing page and the full-stack app are built by two different
agents. If the shape of that JSON is free-form, the second agent has to reverse-engineer
it on every run and the migration to Postgres goes wrong. If the shape is fixed, the
second agent can read it, map it to tables, and move on.

---

## The three buckets

| Bucket | Purpose | Who owns it |
| --- | --- | --- |
| `business` | Facts about the real business. Database-backed. Owner-editable. | Prompt 2 seeds these as rows |
| `offerings`, `reviews`, `gallery` | Repeating records. Database-backed. Owner-editable. | Prompt 2 seeds these as rows |
| `content` | Presentational copy: headlines, section text, nav, marquee. | Prompt 2 ports verbatim to components |

The split matters. `business` and the three collections are **data**. `content` is
**design**. Prompt 1 is free to invent `content` keys per business — that is where the
personality lives. `business` and the collections are **not** free: they have a fixed
shape so the backend can be written without guessing.

---

## Shape

```jsonc
{
  "$contract": "maps-to-landing/site-data@1",

  "meta": {
    "generatedAt": "2026-06-12",
    "source": "google-maps",              // "google-maps" | "website" | "owner-supplied"
    "sourceUrl": "https://maps.app.goo.gl/…",
    "language": "fr"                      // BCP 47 primary language
  },

  "business": {
    "name": "FRENCHY",
    "branch": "Ain Allah",                // null when the business has no branch label
    "category": "Dessert café",
    "cuisine": null,                       // string[] for food businesses, else null
    "languages": ["fr"],

    "phone": {
      "e164": "+213556508142",
      "display": "0556 50 81 42",
      "whatsapp": null                    // null unless a WhatsApp number was confirmed
    },

    "address": {
      "line1": "Coopérative El Moustakbel, n° 286, Route Ain Allah",
      "neighborhood": "Ain Allah",      // colloquial area name ("Sidi Yahia")
      "locality": "Dély Ibrahim",       // commune / district — often != city
      "city": "Alger",                   // maps to addressRegion
      "region": null,                    // English/region name when it differs ("Algiers")
      "postalCode": "16302",
      "country": "Algérie",
      "countryCode": "DZ",
      "short": "Ain Allah · Alger",       // the "Location" line under the brand
      "full": "Coopérative El Moustakbel, n° 286, Route Ain Allah, Dély Ibrahim 16302"
    },

    "coordinates": { "lat": 36.7501648, "lng": 2.9951359 },

    "rating": {
      "value": null,                      // null when unverified — never invent
      "reviewCount": null,
      "url": "https://www.google.com/maps/search/?api=1&query=…",
      "source": "google-maps"
    },

    "hours": {
      "timezone": "Africa/Algiers",
      "source": "Restaurant Guru, fiche consultée en 2026",
      "schedule": [
        { "day": "Sunday", "label": "Dimanche", "open": "11:00", "close": "23:00" }
      ]
    },

    "socials": { "instagram": null, "facebook": null, "tiktok": null },

    "links": {
      "maps": "…/maps/dir/?api=1&destination=…",
      "place": "…/maps/search/?api=1&query=…",
      "directions": "…/maps/dir/?api=1&destination=…",
      "website": null,
      "menu": null,
      "order": null,
      "booking": null
    }
  },

  "content": {
    "hero": {
      "eyebrow": "…",
      "titleStart": "…",
      "titleAccent": "…",                // rendered inside <em>
      "description": "…",
      "note": "…",
      "caption": "…",
      "sticker": "…"
    },
    "sections": {
      // Free-form. One key per presentational section on the page,
      // named after the section id: "signature", "experience", "story",
      // "showcase", "visit", "location", "final"…
      "signature": { "eyebrow": "…", "titleStart": "…", "titleAccent": "…", "description": "…", "cta": "…", "badge": "…" }
    },
    "navigation": [ { "label": "La carte", "href": "#carte" } ],
    "marquee": [ "Sundae", "Crêpes" ],
    "footer": {
      "description": "…",
      "links": [ { "label": "Instagram", "href": "…" } ]
    },
    "socialProof": { "headline": "…", "body": "…", "cta": "…" }
  },

  "offerings": [
    {
      "id": "sundae",
      "name": "Sundae",
      "description": "Nutella, Oreo, Kinder Bueno et autres toppings.",
      "price": 250,                       // number only, in `currency`
      "priceDisplay": "Dès 250 DA",       // optional pre-formatted string
      "currency": "DZD",
      "tag": "01 / Glaces",               // optional eyebrow or category label
      "category": "Glaces",
      "featured": false,
      "order": 1,
      "url": null,
      "visual": "sundae",                 // CSS-drawn art variant, never a stock photo
      "icon": "✳"
    }
  ],

  "reviews": [
    {
      "id": "r1",
      "quote": "Excellent bol et dessert !",
      "author": "RAD BOU",
      "source": "Restaurant Guru",
      "url": "https://…",
      "rating": null,
      "featured": false
    }
  ],

  "gallery": [ { "id": "g1", "src": null, "alt": "…", "caption": null } ],

  "assets": { "logo": null, "hero": null, "ogImage": null },

  "seo": {
    "title": "FRENCHY Ain Allah — Sundae, crêpes et desserts à Alger",
    "description": "Découvrez la carte de FRENCHY Ain Allah…",
    "canonical": "https://example.com/",
    "ogImage": null
  },

  "missing": [
    "Google rating and review count were not verifiable — ask the owner."
  ]
}
```

---

## Repeat-once rule and token substitution

A fact that appears in two places on the page is one bug waiting to happen: the
owner edits the database, and the second copy goes stale and starts lying. So
`content` strings may reference `business` facts through tokens instead of
retyping them:

| Token | Resolves to |
| --- | --- |
| `{rating}` | `business.rating.value`, formatted to one decimal in the page language |
| `{reviewCount}` | `business.rating.reviewCount` |
| `{phone}` | `business.phone.display` |
| `{address}` | `line1, locality, postalCode city` |
| `{addressShort}` | `line1, locality, city` |

Example 2 shows this working:

```json
"content": {
  "trust": { "ratingLabel": "{rating} / 5 sur Google*",
             "reviewsLabel": "{reviewCount} avis répertoriés" },
  "location": { "address": "{address}", "shortAddress": "{addressShort}" }
}
```

The renderer substitutes tokens at bind time. `examples/thaisty-crousty.html`
has the reference implementation in its `[data-bind]` loop; copy it rather than
inventing a second mechanism.

The same rule applies in reverse: `business` and the collections must never
contain display-case strings. `"AIN ALLAH · ALGER"` is wrong, `"Ain Allah · Alger"`
is right — let `text-transform` handle the casing.

---

## Rules

1. **`$contract` is mandatory.** A page without it predates this contract and must be
   migrated before it is handed to Prompt 2.
2. **Unknown is `null`, never a guess.** No invented ratings, prices, awards, review
   counts, or opening hours. `null` is a valid, useful answer; a plausible fabrication
   is a defect, because the owner will spot it and the sale dies.
3. **`missing` is not optional.** Every `null` that a customer would want filled in gets
   a plain-language line here. Prompt 1 prints this list to the user; Prompt 2 seeds it
   as a TODO for the owner dashboard.
4. **`price` is a number.** `priceDisplay` carries the formatted string when the page
   wants one ("Dès 250 DA", "à partir de"). Never store a formatted string in `price`.
5. **`hours.schedule[].day` is an English weekday key** (`"Sunday"`, …) so the backend can
   index it. `label` is the localized display string. `open`/`close` are 24-hour `HH:MM`.
   `close <= open` means the day closes after midnight.
6. **No images are invented.** `gallery[].src` and `assets.*` are `null` until a real URL
   is found. CSS-drawn `visual` variants stand in until then.
7. **`content` is the only free-form part.** Prompt 2 ports `content` into React
   components and does not put it in the database.

---

## How Prompt 2 consumes it

The mapping is deliberately one-to-one:

| `site-data` path | Table | Notes |
| --- | --- | --- |
| `business` | `businesses` | one row; `owner_id` FK to `auth.users` |
| `business.hours.schedule[]` | `business_hours` | `day_of_week smallint`, `open_time`, `close_time`, composite index |
| `business.socials.*` | `business_socials` | one row per non-null network |
| `business.links.*` | `business_links` | one row per non-null link, `kind` enum |
| `business.cuisine` | `businesses.cuisine` | `text[]`, empty for non-food businesses |
| `offerings[]` | `offerings` | `business_id` FK, `position` for ordering |
| `reviews[]` | `reviews` | `business_id` FK, nullable author |
| `gallery[]` | `media` | `business_id` FK, `storage_path` replaces `src` after upload |
| `seo` | `businesses` | `seo_title`, `seo_description`, `seo_canonical` |
| `content` | — | React components, not a table |

Token substitution has no database equivalent. Expand `{address}` and friends in
the React layer, reading from the `businesses` row — do not add a second copy of
the address to the schema.

Form submissions (contact, booking, order) go to their own tables — `inquiries`,
`bookings`, `orders` — behind RLS that blocks anonymous writes. That is Prompt 2's
Phase 3, not this document's problem.

---

## Checking a page against the contract

```bash
node tools/check-contract.mjs examples/your-page.html
node tools/render-snapshot.mjs examples/your-page.html --json
```

`check-contract.mjs` reports missing required keys, `null` values that need a
`missing[]` note, and stray keys under `business`. `render-snapshot.mjs` proves the
page still runs and reports what it rendered — diffing two snapshots proves a
refactor changed nothing.