---
name: site-audit
description: Crawls a website and audits it against WCAG 2.1 AA, Nielsen's usability heuristics, and responsive/performance best practices, then generates a Mad River-branded, citable PDF (plus a Markdown report) covering every page found. Use this whenever the user asks to audit a website's UX or UI, review a site for accessibility or usability issues, "check this site," generate a site audit report, or wants a branded audit PDF/deliverable for a client or stakeholder — even if they don't name this tool directly or say the word "skill." Also use to re-run or refresh an existing audit after a site changes.
---

# Site Audit

Runs the UX/UI auditor CLI that lives in this repo (`src/cli.js`) and reports
back the results. The tool crawls a site with a real browser, checks every
page against accessibility, responsive-design, performance, and content/
structure norms, and writes a Mad River-branded PDF + Markdown report.

## When to use this

Trigger on requests like "audit this site," "check example.com for
accessibility issues," "run a UX review," "generate an audit report for
[url]," "how's the usability of our site," or "make me a PDF report on
[site]'s UX." Prefer this skill over building a one-off script — the checks,
scoring, citations, and branding are already implemented and tested here.

## How to run it

From the repo root:

```bash
node src/cli.js <url> [options]
```

If `node_modules/` is missing, run `npm install` first (needs `playwright`
and `axe-core`, both in `package.json`).

By default it **crawls the whole site** (same-origin only), following links
up to `--max-depth` hops and `--max-pages` pages, and audits every page it
finds. Ask the user for a URL if they haven't given one.

Key options:

- `-o, --output <dir>` — output directory (default `./audit-output`)
- `--max-pages <n>` — crawl limit (default 15) — raise for larger sites, but
  warn the user this takes roughly a few seconds per page
- `--max-depth <n>` — link-depth limit (default 3)
- `--single-page` — audit only the given URL, no crawling — use this if the
  user says "just this page" or gives a URL that's clearly a single
  standalone document
- `--no-pdf` — skip the PDF, Markdown-only (rare; PDF is the primary
  deliverable)
- `-t, --timeout <ms>` — per-page load timeout (default 30000) — raise for
  slow sites

The command prints a per-category scorecard to stdout and the paths to the
generated `.md` and `.pdf` files. After running, **send the PDF to the user**
(it's the deliverable) rather than just reporting the file path, and
summarize the site score and the top few findings in your reply — don't
just dump the whole report into chat.

## What it checks

Four categories, each independently scored 0–100 with a letter grade, then
averaged into one site-wide score:

- **Accessibility** — WCAG 2.1 A/AA via axe-core (contrast, alt text, ARIA,
  labels, landmarks, heading order)
- **Responsive Design** — viewport meta tag, horizontal overflow at mobile/
  tablet/desktop widths, touch target size, mobile font size
- **Performance** — load time, time-to-first-byte, request count, page
  weight
- **Content & Structure** — title/meta description, favicon, `lang`
  attribute, heading hierarchy, vague link text, broken images, nav
  landmark, unsafe `target="_blank"` links, console/JS errors

Every finding is cited to an authoritative source (WCAG success criteria,
Nielsen Norman Group, web.dev, MDN, WebAIM, OWASP) — the PDF's References
page lists them all. See `README.md` for the full norm-to-check mapping.

## Brand system

The PDF follows Mad River Ltd's creative template — DIN Next LT Pro Bold
Condensed + Spock Striked type (embedded, no install needed), black/white/
khaki palette, the guide's spec-sheet layout and footer format, and the
literal keyline wordmark on the cover/back page. Details and known caveats
(the khaki hex is an approximation; the wordmark needs a white card on dark
backgrounds since it's transparent line-art) are documented in `README.md`
under "Brand system" — read that before changing colors, fonts, or logo
placement in `src/report/generateHtmlReport.js`.

## Extending checks or design

- New check logic goes in `src/checks/*.js` — each exports a function that
  takes a Playwright `page` and returns `{ issues, ...data }`. Issues need
  `category`, `severity`, `title`, `description`, `norm`, and a
  `references` array of `{ title, url }` citations (see
  `src/report/references.js` for the existing citation set to reuse).
- Report layout/styling lives in `src/report/generateHtmlReport.js`
  (PDF/HTML) and `src/report/generateReport.js` (Markdown).
- Scoring weights live in `src/report/score.js`.

After changing checks or design, re-run against the fixtures in
`examples/site/` (a small 4-page linked test site) before trusting the
output — see "Trying it out" in `README.md`.
