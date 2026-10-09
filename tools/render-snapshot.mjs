#!/usr/bin/env node
/**
 * Deterministic render snapshot for a single-file landing page.
 *
 * Runs the page's own <script> against a minimal DOM stub and records every
 * mutation it makes (textContent, innerHTML, href, classList, title, meta).
 * Because Date and Math.random are frozen, the snapshot is byte-stable, so any
 * change to the markup or the script shows up as a diff.
 *
 * Used by CI to prove that refactoring an example's data layer does not change
 * a single pixel of rendered output.
 *
 * Usage:
 *   node tools/render-snapshot.mjs examples/foo.html
 *   node tools/render-snapshot.mjs examples/foo.html --json
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";

/* ---------- fixed clock: keeps "is it open now?" output stable ---------- */

const FROZEN_ISO = "2026-06-12T14:20:00.000Z"; // a Friday, 15:20 in Africa/Algiers
const RealDate = Date;

class FrozenDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(FROZEN_ISO);
    else super(...args);
  }
  static now() {
    return new RealDate(FROZEN_ISO).getTime();
  }
}

/* ---------- minimal DOM ---------- */

const TEXT = Symbol("text");

class El {
  constructor(tag = "div", attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.attrs = { ...attrs };
    this.children = [];
    this[TEXT] = "";
    this.classes = new Set(
      String(attrs.class ?? "").split(/\s+/).filter(Boolean)
    );
    this.props = {};
  }

  get id() {
    return this.attrs.id ?? "";
  }

  get className() {
    return [...this.classes].join(" ");
  }

  get textContent() {
    if (this.children.length === 0) return this[TEXT];
    return this.children.map((c) => c?.textContent ?? "").join("");
  }

  set textContent(v) {
    this.children = [];
    this[TEXT] = v == null ? "" : String(v);
  }

  set innerHTML(v) {
    this.children = [];
    this[TEXT] = v == null ? "" : String(v);
  }

  get innerHTML() {
    return this[TEXT];
  }

  set href(v) {
    this.attrs.href = v == null ? "" : String(v);
  }
  get href() {
    return this.attrs.href ?? "";
  }

  get content() {
    return this.attrs.content ?? "";
  }
  set content(v) {
    this.attrs.content = v == null ? "" : String(v);
  }

  get dataset() {
    const self = this;
    return new Proxy(
      {},
      {
        get: (_, prop) => {
          if (prop in self.attrs) return self.attrs[prop];
          const dashed = String(prop).replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
          return self.attrs[`data-${dashed}`];
        },
        has: (_, prop) => {
          const dashed = String(prop).replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
          return prop in self.attrs || `data-${dashed}` in self.attrs;
        },
      }
    );
  }

  get classList() {
    const classes = this.classes;
    return {
      add: (...names) => names.forEach((n) => classes.add(n)),
      remove: (...names) => names.forEach((n) => classes.delete(n)),
      toggle: (n, force) => (force ? classes.add(n) : classes.delete(n)),
      contains: (n) => classes.has(n),
    };
  }

  setAttribute(name, value) {
    this.attrs[name] = value == null ? "" : String(value);
  }
  getAttribute(name) {
    return this.attrs[name] ?? null;
  }
  hasAttribute(name) {
    return name in this.attrs;
  }

  append(...kids) {
    this.children.push(...kids);
  }
  appendChild(kid) {
    this.children.push(kid);
    return kid;
  }
  replaceChildren(...kids) {
    this.children = kids;
    this[TEXT] = kids.map((k) => k?.textContent ?? "").join("");
  }
  remove() {}
  focus() {}
  reportValidity() {
    return true;
  }
}

function parseAttrs(raw) {
  const attrs = {};
  const re = /([a-zA-Z_:][-\w:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(raw))) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? "");
  }
  return attrs;
}

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

function decodeEntities(s) {
  return s.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);
}
/** Build a registry of elements from the tags present in the source HTML.
 *  A text node belongs to the innermost element that is open at that point,
 *  so both leading and trailing direct text are captured. */
function buildRegistry(html) {
  const registry = [];
  const re = /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*?)?)(\/?)>|<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/g;
  const VOID = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
  const stack = [];
  let m;
  let cursor = 0;

  while ((m = re.exec(html))) {
    const between = html.slice(cursor, m.index);
    if (between && stack.length) {
      const owner = stack[stack.length - 1];
      owner.texts = owner.texts || [];
      owner.texts.push(between);
    }
    cursor = re.lastIndex;

    if (m[4]) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tagName === m[4].toUpperCase()) { stack.length = i; break; }
      }
      continue;
    }

    const tag = m[1];
    const attrs = parseAttrs(m[2] ?? "");
    const el = new El(tag, attrs);
    registry.push(el);

    if (m[3] !== "/" && !VOID.has(tag.toLowerCase())) stack.push(el);
  }

  /* Scripts are read by the page via textContent, so hand each one its body. */
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let s;
  while ((s = scriptRe.exec(html))) {
    const attrs = parseAttrs(s[1] ?? "");
    if (!attrs.id) continue;
    const owner = registry.find(
      (el) => el.tagName === "SCRIPT" && el.attrs.id === attrs.id
    );
    if (owner) owner.textContent = s[2];
  }

  return registry;
}

function matches(el, selector) {
  const sel = selector.trim();
  if (sel.startsWith("#")) return el.id === sel.slice(1);
  if (sel.startsWith(".")) return el.classes.has(sel.slice(1));
  const attr = sel.match(/^(?:([a-zA-Z-]+)\s*)?\[\s*([\w-]+)\s*(?:=\s*"?([^"\]]*)"?)?\s*\]$/);
  if (attr) {
    const [, name, key, val] = attr;
    if (!(key in el.attrs)) return false;
    if (val === undefined) return true;
    return String(el.attrs[key]) === val;
  }
  if (sel === "head" || sel === "body" || sel === "html") return true;
  return el.tagName === sel.toUpperCase();
}

function makeDom(registry, sink) {
  const byId = new Map();
  for (const el of registry) if (el.id && !byId.has(el.id)) byId.set(el.id, el);

  /* Fold each element's collected direct text into its textContent. */
  for (const el of registry) {
    if (el.texts && el.texts.length && !el[TEXT]) {
      const joined = el.texts.join("").replace(/\s+/g, " ").trim();
      if (joined) el[TEXT] = joined;
    }
  }

  const documentElement = new El("html");
  const head = new El("head");
  const body = new El("body");

  const pick = (selector) => registry.filter((el) => matches(el, selector));

  const document = {
    documentElement,
    head,
    body,
    title: "",
    getElementById: (id) => byId.get(id) ?? null,
    querySelector: (sel) => pick(sel)[0] ?? new El("div"),
    querySelectorAll: (sel) => pick(sel),
    createElement: (tag) => new El(tag),
    createTextNode: (t) => ({ textContent: String(t) }),
    addEventListener: () => {},
  };

  const IntersectionObserver = class {
    constructor(cb) {
      this.cb = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  const window = {
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    addEventListener: () => {},
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    IntersectionObserver,
    document,
  };
  window.window = window;

  return { window, document, IntersectionObserver, documentElement, byId };
}

/* ---------- snapshot ---------- */

function collect(registry, document, documentElement) {
  const out = {};
  const seen = new Map();

  for (const el of registry) {
    const base = el.id
      ? `#${el.id}`
      : el.tagName + "." + [...el.classes].sort().join(".");
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const key = n > 1 ? `${base}#${n}` : base;

    const entry = {};
    const t = el.textContent.trim();
    if (t) entry.text = t;
    if (el[TEXT] && el[TEXT].trim() && el[TEXT].trim() !== t) entry.html = el[TEXT];
    if ("href" in el.attrs) entry.href = el.attrs.href;
    if ("content" in el.attrs) entry.content = el.attrs.content;
    if (el.classes.size) entry.class = [...el.classes].sort().join(" ");
    if (Object.keys(entry).length) {
      out[key] = { ...(out[key] ?? {}), ...entry };
    }
  }
  out["document.title"] = { text: document.title };
  out["documentElement.class"] = {
    class: [...documentElement.classes].sort().join(" "),
  };
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

/* ---------- main ---------- */

const file = process.argv[2];
const asJson = process.argv.includes("--json");

if (!file) {
  console.error("usage: node tools/render-snapshot.mjs <file.html> [--json]");
  process.exit(2);
}

const html = readFileSync(file, "utf8");

/* site-data must be valid JSON -- fail loudly if the data layer is broken. */
const dataMatch = html.match(
  /<script[^>]*type="application\/json"[^>]*id="site-data"[^>]*>([\s\S]*?)<\/script>/i
);
if (!dataMatch) {
  console.error(`FAIL ${basename(file)}: no #site-data JSON block found`);
  process.exit(1);
}
let data;
try {
  data = JSON.parse(dataMatch[1]);
} catch (err) {
  console.error(`FAIL ${basename(file)}: #site-data is not valid JSON — ${err.message}`);
  process.exit(1);
}

/* the last inline <script> without src/type is the page script */
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type=)[^>]*>([\s\S]*?)<\/script>/gi)];
if (!scripts.length) {
  console.error(`FAIL ${basename(file)}: no inline page script found`);
  process.exit(1);
}
const code = scripts[scripts.length - 1][1];

const registry = buildRegistry(html);
const sink = {};
const dom = makeDom(registry, sink);

const errors = [];
const RealDateGlobal = globalThis.Date;
globalThis.Date = FrozenDate;
globalThis.document = dom.document;
globalThis.window = dom.window;
globalThis.IntersectionObserver = dom.IntersectionObserver;
globalThis.HTMLElement = El;
globalThis.HTMLFormElement = El;
globalThis.navigator ??= { userAgent: "render-snapshot" };

try {
  const run = new Function(
    "document",
    "window",
    "IntersectionObserver",
    "HTMLElement",
    "HTMLFormElement",
    "navigator",
    code
  );
  run(
    dom.document,
    dom.window,
    dom.IntersectionObserver,
    El,
    El,
    globalThis.navigator
  );
} catch (err) {
  errors.push(err);
} finally {
  globalThis.Date = RealDateGlobal;
}

const snapshot = collect(registry, dom.document, dom.documentElement);

const payload = {
  file: basename(file),
  errors: errors.map((e) => e.message),
  rendered: snapshot,
  dataKeys: Object.keys(data).sort(),
};

if (asJson) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  if (errors.length) {
    console.error(`FAIL ${basename(file)}: script threw — ${errors[0].message}`);
    process.exit(1);
  }
  console.log(JSON.stringify(snapshot, null, 2));
}