# UX/UI Auditor

A CLI tool that loads a website with a real browser (Playwright/Chromium) and
audits it against common UX and UI norms, then generates a Markdown audit
report with screenshots, a scorecard, and prioritized recommendations.

## What it checks

| Category | Examples | Reference norms |
|---|---|---|
| **Accessibility** | Color contrast, alt text, ARIA, form labels, landmarks, heading order | WCAG 2.1 A/AA (via [axe-core](https://github.com/dequelabs/axe-core)) |
| **Responsive Design** | Viewport meta tag, horizontal overflow at mobile/tablet/desktop widths, touch target size, mobile font size | WCAG 2.5.5, Google Mobile-Friendly guidelines |
| **Performance** | Load time, time-to-first-byte, request count, page weight | Core Web Vitals / web performance best practice |
| **Content & Structure** | Title/meta description, favicon, `lang` attribute, heading hierarchy, vague link text, broken images, nav landmark, unsafe `target="_blank"` links, console/JS errors | Nielsen's usability heuristics, SEO best practice |

Each finding is tagged with a severity (Critical/High/Medium/Low), the
specific norm it violates, and a plain-language explanation of the impact —
suitable for handing to a design or engineering team as an action list.

## Usage

```bash
npm install
node src/cli.js <url> [options]
```

Options:

- `-o, --output <dir>` — output directory for the report + screenshots (default: `./audit-output`)
- `-t, --timeout <ms>` — page load timeout (default: `30000`)

Example:

```bash
node src/cli.js https://example.com --output ./reports/example
```

This produces:

```
reports/example/
  example-com-ux-ui-audit.md      # the audit report
  screenshots/
    example-com-mobile.png
    example-com-tablet.png
    example-com-desktop.png
```

### Report contents

- Overall score (0-100) and letter grade, broken down by category
- Priority recommendations (top Critical/High issues)
- Mobile/tablet/desktop screenshots
- Detailed findings per category, each with severity, description, the norm
  it references, and a code sample where relevant
- Raw performance metrics (load time, request count, page weight)

## As a library

```js
import { auditWebsite } from './src/audit.js';

const { reportPath, scorecard, allIssues } = await auditWebsite('https://example.com', {
  outputDir: './out',
});
```

## Scope and limitations

- Audits a single page per run (not a full-site crawl).
- Automated checks catch a meaningful, well-established subset of UX/UI
  problems but are not a substitute for manual usability testing with real
  users, nor for a full manual WCAG audit.
- Pages requiring authentication or complex interaction flows before the
  content of interest is visible are not currently supported out of the box.

## Trying it out

`examples/` contains two static pages for sanity-checking the tool:
`sample-site.html` (deliberately seeded with ~20 common issues) and
`good-site.html` (a clean baseline that should score 100/100). Serve them
locally and point the CLI at them:

```bash
npx http-server examples -p 8080 &
node src/cli.js http://localhost:8080/sample-site.html
```
