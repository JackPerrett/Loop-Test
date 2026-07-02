import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

import { runAccessibilityCheck } from './checks/accessibility.js';
import { runResponsiveCheck, VIEWPORTS } from './checks/responsive.js';
import { runPerformanceCheck } from './checks/performance.js';
import { runContentCheck } from './checks/content.js';
import { generateMarkdownReport } from './report/generateReport.js';

function resolveChromiumExecutable() {
  // Some sandboxed environments pre-install a specific Chromium build outside
  // of Playwright's expected version path. Prefer it when present, otherwise
  // fall back to Playwright's own resolution (undefined = default behaviour).
  const candidate = process.env.PLAYWRIGHT_CHROMIUM_PATH
    || (process.env.PLAYWRIGHT_BROWSERS_PATH
      ? path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium')
      : null);
  if (candidate && fs.existsSync(candidate)) return candidate;
  return undefined;
}

function slugify(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
}

/**
 * Runs a full UX/UI audit against a single URL and writes a Markdown report
 * (with screenshots) to outputDir. Returns the scorecard and report path.
 */
export async function auditWebsite(url, options = {}) {
  const outputDir = options.outputDir || './audit-output';
  const timeoutMs = options.timeout || 30000;
  const slug = slugify(url) || 'site';

  fs.mkdirSync(outputDir, { recursive: true });
  const screenshotDir = path.join(outputDir, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: resolveChromiumExecutable(),
  });
  const context = await browser.newContext({
    viewport: { width: VIEWPORTS[2].width, height: VIEWPORTS[2].height },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
  } catch (err) {
    await browser.close();
    throw new Error(`Failed to load ${url}: ${err.message}`);
  }

  const [accessibility, content, performance] = await Promise.all([
    runAccessibilityCheck(page),
    runContentCheck(page),
    runPerformanceCheck(page),
  ]);

  // Responsive check mutates viewport size, so it must run after the others.
  const responsive = await runResponsiveCheck(page, { screenshotDir, slug });

  await browser.close();

  const allIssues = [
    ...accessibility.issues,
    ...content.issues,
    ...performance.issues,
    ...responsive.issues,
  ];

  if (consoleErrors.length > 0) {
    allIssues.push({
      category: 'Content & Structure',
      severity: 'Medium',
      title: `${consoleErrors.length} JavaScript error(s) logged during page load`,
      description: `Console/runtime errors can silently break interactive features. First error: "${consoleErrors[0].slice(0, 200)}"`,
      norm: "Nielsen Heuristic #9 (Help Users Recognize, Diagnose, and Recover from Errors)",
      affectedElements: consoleErrors.length,
    });
  }

  const { markdown, scorecard } = generateMarkdownReport({
    url,
    generatedAt: new Date().toISOString(),
    meta: content.meta,
    metrics: performance.metrics,
    screenshots: responsive.screenshots,
    allIssues,
    reportDir: outputDir,
  });

  const reportPath = path.join(outputDir, `${slug}-ux-ui-audit.md`);
  fs.writeFileSync(reportPath, markdown, 'utf-8');

  return { reportPath, scorecard, allIssues, screenshots: responsive.screenshots };
}
