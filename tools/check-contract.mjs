#!/usr/bin/env node
/**
 * Validate a landing page against maps-to-landing/site-data@1.
 *
 * Checks the things that silently break the handoff to the full-stack prompt:
 * a missing contract marker, a missing required key, a `null` that nobody
 * promised to fill in, and stray keys under `business` that the second agent
 * would not know what to do with.
 *
 * Usage:
 *   node tools/check-contract.mjs examples/page.html
 *   node tools/check-contract.mjs examples/*.html --quiet
 *
 * Exit code 0 = pass, 1 = at least one error.
 */

import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const CONTRACT = "maps-to-landing/site-data@1";

const paths = (obj, dotted) =>
  dotted.split(".").reduce((value, key) => (value == null ? value : value[key]), obj);

const REQUIRED = [
  "$contract",
  "meta.generatedAt",
  "meta.source",
  "meta.language",
  "business.name",
  "business.category",
  "business.languages",
  "business.phone.e164",
  "business.phone.display",
  "business.address.line1",
  "business.address.locality",
  "business.address.city",
  "business.address.countryCode",
  "business.address.short",
  "business.address.full",
  "business.coordinates",
  "business.rating.value",
  "business.rating.reviewCount",
  "business.rating.url",
  "business.hours.timezone",
  "business.hours.schedule",
  "business.socials",
  "business.links.directions",
  "offerings",
  "reviews",
  "gallery",
  "assets",
  "seo.title",
  "seo.description",
  "missing",
];

const BUSINESS_KEYS = [
  "name", "branch", "category", "cuisine", "languages", "phone", "address",
  "coordinates", "rating", "hours", "socials", "links",
];

const OFFERING_KEYS = [
  "id", "name", "description", "price", "currency", "tag", "category",
  "featured", "order", "url", "cta", "visual", "icon",
];

const REVIEW_KEYS = ["id", "quote", "author", "source", "url", "rating", "featured"];

const KNOWN_TOKENS = [
  "{rating}", "{reviewCount}", "{phone}", "{address}", "{addressShort}",
];

/** Expand "dir/*.html" style arguments so the tool behaves the same in
 *  bash, PowerShell and cmd without the shell helping. */
function expand(patterns) {
  const out = [];
  for (const pattern of patterns) {
    if (!pattern.includes("*")) {
      out.push(pattern);
      continue;
    }
    const star = pattern.indexOf("*");
    const dir = pattern.slice(0, star).replace(/[/\\]$/, "") || ".";
    const re = new RegExp(
      "^" +
        pattern
          .slice(star)
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*") +
        "$"
    );
    for (const entry of readdirSync(dir)) if (re.test(entry)) out.push(join(dir, entry));
  }
  return out;
}

const files = expand(process.argv.slice(2).filter((a) => !a.startsWith("--")));
const quiet = process.argv.includes("--quiet");

if (!files.length) {
  console.error("usage: node tools/check-contract.mjs <file.html> [...]");
  process.exit(2);
}

let failed = 0;

for (const file of files) {
  const html = readFileSync(file, "utf8");
  const errors = [];
  const warnings = [];

  const match = html.match(
    /<script[^>]*type="application\/json"[^>]*id="site-data"[^>]*>([\s\S]*?)<\/script>/i
  );

  if (!match) {
    console.error(`FAIL ${basename(file)}: no #site-data JSON block`);
    failed++;
    continue;
  }

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch (err) {
    console.error(`FAIL ${basename(file)}: #site-data is invalid JSON — ${err.message}`);
    failed++;
    continue;
  }

  /* 1. contract marker */
  if (data.$contract !== CONTRACT) {
    errors.push(`$contract is "${data.$contract ?? "(absent)"}", expected "${CONTRACT}"`);
  }

  /* 2. required keys */
  for (const p of REQUIRED) {
    if (paths(data, p) === undefined) errors.push(`missing required key: ${p}`);
  }

  /* 3. stray keys under business */
  if (data.business && typeof data.business === "object") {
    for (const key of Object.keys(data.business)) {
      if (!BUSINESS_KEYS.includes(key)) {
        errors.push(`unexpected key under business: "${key}"`);
      }
    }
    for (const key of BUSINESS_KEYS) {
      if (!(key in data.business)) errors.push(`missing required key: business.${key}`);
    }
  }

  /* 4. offerings shape */
  if (!Array.isArray(data.offerings)) {
    errors.push("offerings must be an array");
  } else {
    data.offerings.forEach((item, i) => {
      if (typeof item.price !== "number" && item.price !== null) {
        errors.push(
          `offerings[${i}].price must be a number (use priceDisplay for formatted text), got ${typeof item.price}`
        );
      }
      if (!item.id) warnings.push(`offerings[${i}] has no id`);
      if (!item.name) errors.push(`offerings[${i}].name is required`);
      for (const key of OFFERING_KEYS) {
        if (!(key in item)) warnings.push(`offerings[${i}] missing optional key "${key}"`);
      }
    });
  }

  /* 5. reviews shape */
  if (Array.isArray(data.reviews)) {
    data.reviews.forEach((review, i) => {
      if (!review.id) warnings.push(`reviews[${i}] has no id`);
      if (!review.quote) errors.push(`reviews[${i}].quote is required`);
      if (!review.source) errors.push(`reviews[${i}].source is required — never present an unattributed quote`);
      for (const key of REVIEW_KEYS) {
        if (!(key in review)) warnings.push(`reviews[${i}] missing optional key "${key}"`);
      }
    });
  }

  /* 6. unknown tokens in content strings */
  const content = data.content;
  if (content && typeof content === "object") {
    const walk = (node, trail) => {
      if (typeof node === "string") {
        for (const m of node.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)) {
          if (!KNOWN_TOKENS.includes(`{${m[1]}}`)) {
            errors.push(`unknown token {${m[1]}} in content.${trail}`);
          }
        }
      } else if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) walk(v, trail ? `${trail}.${k}` : k);
      }
    };
    walk(content, "");
  }

  /* 7. nulls that a customer would want filled */
  const notableNulls = [];
  const note = (p) => {
    if (paths(data, p) === null) notableNulls.push(p);
  };
  note("business.rating.value");
  note("business.rating.reviewCount");
  note("business.phone.whatsapp");
  note("business.socials.instagram");
  note("business.socials.facebook");
  note("business.socials.tiktok");
  note("business.links.order");
  note("business.links.booking");
  note("business.coordinates");

  const missingList = Array.isArray(data.missing) ? data.missing : [];

  /* 8. single-file rule: no hotlinked assets, but outbound CTA links are fine */
  if (/<script[^>]+src=/i.test(html)) {
    errors.push("page loads an external script — Prompt 1 requires a single self-contained file");
  }

  const assetUrls = [
    ...html.matchAll(/<(?:img|source|video|audio|embed|iframe)\b[^>]*\bsrc\s*=\s*"([^"]+)"/gi),
    ...html.matchAll(/<link\b[^>]*\brel\s*=\s*"(?:stylesheet|preload|preconnect)"[^>]*\bhref\s*=\s*"([^"]+)"/gi),
    ...html.matchAll(/url\(\s*['"]?(https?:\/\/[^'")]+)['"]?\s*\)/gi),
  ]
    .map((m) => m[1])
    .filter((u) => !/fonts\.(googleapis|gstatic)\.com/.test(u));

  if (assetUrls.length) {
    errors.push(
      `page hotlinks ${assetUrls.length} asset(s) outside Google Fonts — use CSS/SVG art and data-slot instead: ` +
        assetUrls.slice(0, 3).join(", ")
    );
  }

  if (errors.length) failed++;

  if (!quiet || errors.length) {
    const label = errors.length ? "FAIL" : "PASS";
    console.log(
      `${label} ${basename(file)}  (${Array.isArray(data.offerings) ? data.offerings.length : 0} offerings, ` +
        `${Array.isArray(data.reviews) ? data.reviews.length : 0} reviews, ` +
        `${notableNulls.length} nulls, ${missingList.length} missing-info notes)`
    );
    for (const e of errors) console.log(`     error   ${e}`);
    for (const w of warnings) console.log(`     warn    ${w}`);
    if (notableNulls.length) {
      console.log(`     info    null facts: ${notableNulls.join(", ")}`);
    }
    if (missingList.length) {
      console.log(`     info    ${missingList.length} item(s) declared in "missing"`);
    }
  }
}

process.exit(failed ? 1 : 0);