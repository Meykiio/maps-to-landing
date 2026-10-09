# Contributing

This repository is small on purpose. Two prompts, two examples, two tools. Most
changes should be small too.

## The one rule

**An example must never change visually unless the change is the point.**

The examples are the proof that the prompts work. If a refactor of the data
layer quietly moves a headline or breaks a link, the repository starts claiming
something it no longer demonstrates. CI exists to stop that.

## Before you open a pull request

```bash
node tools/check-contract.mjs "examples/*.html"
node tools/render-snapshot.mjs examples/frenchy-ain-allah.html --json \
  > /tmp/a.json && diff examples/__snapshots__/frenchy-ain-allah.json /tmp/a.json
node tools/render-snapshot.mjs examples/thaisty-crousty.html --json \
  > /tmp/b.json && diff examples/__snapshots__/thaisty-crousty.json /tmp/b.json
```

If you changed an example on purpose, regenerate its snapshot in the same commit:

```bash
node tools/render-snapshot.mjs examples/<page>.html --json \
  > examples/__snapshots__/<page>.json
```

A reviewer should be able to run the diff and see precisely what moved. Do not
regenerate a snapshot you did not mean to change.

## Changing the contract

`docs/SITE-DATA-CONTRACT.md` is the interface between the two prompts, so a change
to it is a breaking change for everyone already using it.

- Bump the version string (`maps-to-landing/site-data@N`) if the shape changes.
- Update `REQUIRED` and `BUSINESS_KEYS` in `tools/check-contract.mjs`.
- Update the version string in both prompts.
- Migrate both examples in the same pull request, with a render diff proving zero
  visual change.

If you only add an optional key or a documentation clarification, keep the
version. Say which you did in the pull request.

## Changing a prompt

Keep the phase structure and the tone. The prompts work because they are
specific and opinionated — they tell the agent what to decide rather than asking
it a list of questions. Resist softening them into general instructions.

Two things worth preserving:

- **The truth rules.** No invented reviews, prices, awards or dates. If you relax
  this, the examples become marketing fiction and the repository's whole claim
  collapses.
- **Short phase reporting.** Prompts 2 caps itself at five lines per phase on
  purpose. Long reports cost the user time and change nothing.

If a prompt change makes a claim about the contract, keep it true.

## Adding an example

An example is worth adding if it demonstrates something the current two do not —
another language, an RTL layout, a business category that stretches the
`content` bucket, or a page with a working form.

Copy an existing one, replace the data, and keep the contract. Run the checks.
If it renders differently from the others, that is the point; if it renders the
same, it is not worth adding.

Never commit a real person's private data. Business names, public addresses,
public phone numbers and published hours from public listings are fine. Anything
that is not publicly listed is not.

## Reporting a problem

Open an issue with the business name and the Maps link, plus what the agent did
and what it should have done. For a prompt-quality bug that is the most useful
thing you can send.

If a Maps link cannot be read at all, say so — that is the single most common
failure mode and it is worth knowing how often it happens.