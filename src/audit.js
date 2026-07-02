import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

import { runAccessibilityCheck } from './checks/accessibility.js';
import { runResponsiveCheck, VIEWPORTS } from './checks/responsive.js';
import { runPerformanceCheck } from './checks/performance.js';
import { runContentCheck } from './checks/content.js';
import { filterCrawlableLinks } from './crawl.js';
import { generateSiteMarkdownReport } from './report/generateReport.js';
import { generateHtmlReport } from './report/generateHtmlReport.js';
import { buildScorecard, averageScorecards } from './report/score.js';
import { REFERENCES } from './report/references.js';

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

function resolveProxyConfig() {
  // Playwright's Chromium does not inherit HTTPS_PROXY/HTTP_PROXY from the
  // shell the way curl or Node's own fetch do — it has to be handed to
  // chromium.launch() explicitly, or navigation to any non-bypassed host
  // fails outright in proxied sandboxes.
  const server = process.env.HTTPS_PROXY || process.env.https_proxy
    || process.env.HTTP_PROXY || process.env.http_proxy;
  if (!server) return undefined;
  const bypass = process.env.NO_PROXY || process.env.no_proxy;
  return bypass ? { server, bypass } : { server };
}

async function renderPdf({ html, outputPath, hostname, executablePath }) {
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });

  // Mirrors the brand guide's footer spec: CLIENT NAME / PROJECT-VER / page
  // number, in the "grey base text" variant (the guide's default treatment).
  const footerTemplate = `
    <div style="font-size:7px; font-family: 'Arial Narrow', Arial, sans-serif; letter-spacing:0.06em;
      color:#8a8a86; width:100%; padding:0 16mm; display:flex; justify-content:space-between;
      text-transform:uppercase;">
      <span>${hostname}</span>
      <span>UX/UI Site Audit / Ver 1.0</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`;

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', bottom: '12mm', left: '0mm', right: '0mm' },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate,
  });

  await browser.close();
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
 * Runs every check against a single already-loaded page and returns its
 * findings plus any same-origin links discovered for the crawler.
 */
async function auditPage(page, url, { screenshotDir, slug, captureScreenshots, timeoutMs }) {
  const consoleErrors = [];
  const onPageError = (err) => consoleErrors.push(err.message);
  const onConsole = (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);

  await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });

  const originHostname = new URL(url).hostname;
  const rawHrefs = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')));
  const links = filterCrawlableLinks(rawHrefs, url, originHostname);

  const [accessibility, content, performance] = await Promise.all([
    runAccessibilityCheck(page),
    runContentCheck(page),
    runPerformanceCheck(page),
  ]);

  // Responsive check mutates viewport size, so it must run after the others.
  const responsive = await runResponsiveCheck(page, { screenshotDir, slug, captureScreenshots });

  page.off('pageerror', onPageError);
  page.off('console', onConsole);

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
      norm: 'Nielsen Heuristic #9 (Help Users Recognize, Diagnose, and Recover from Errors)',
      references: [REFERENCES.nnErrorMessages],
      affectedElements: consoleErrors.length,
    });
  }

  return {
    url,
    meta: content.meta,
    metrics: performance.metrics,
    screenshots: responsive.screenshots,
    allIssues,
    links,
  };
}

/**
 * Crawls a website starting at `startUrl` (same-origin only) and runs the
 * full UX/UI check suite against every page it finds, up to maxPages. Writes
 * one aggregated Markdown report and one branded PDF report to outputDir.
 */
export async function auditSite(startUrl, options = {}) {
  const outputDir = options.outputDir || './audit-output';
  const timeoutMs = options.timeout || 30000;
  const generatePdf = options.pdf !== false;
  const maxPages = options.singlePage ? 1 : (options.maxPages || 15);
  const maxDepth = options.singlePage ? 0 : (options.maxDepth ?? 3);
  const executablePath = resolveChromiumExecutable();
  const proxy = resolveProxyConfig();
  const siteSlug = slugify(startUrl) || 'site';

  fs.mkdirSync(outputDir, { recursive: true });
  const screenshotDir = path.join(outputDir, 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, executablePath, proxy });
  const context = await browser.newContext({
    viewport: { width: VIEWPORTS[2].width, height: VIEWPORTS[2].height },
  });
  const page = await context.newPage();

  const visited = new Set();
  const queue = [{ url: startUrl, depth: 0 }];
  const pages = [];
  let firstError = null;

  while (queue.length && pages.length < maxPages) {
    const { url, depth } = queue.shift();
    const normalizedUrl = url.replace(/\/$/, '') || url;
    if (visited.has(normalizedUrl)) continue;
    visited.add(normalizedUrl);

    const pageSlug = `${siteSlug}-p${pages.length + 1}`;
    let result;
    try {
      result = await auditPage(page, url, {
        screenshotDir,
        slug: pageSlug,
        captureScreenshots: pages.length === 0, // only the start page gets full viewport screenshots
        timeoutMs,
      });
    } catch (err) {
      if (pages.length === 0) {
        await browser.close();
        throw new Error(`Failed to load ${url}: ${err.message}`);
      }
      firstError = firstError || err;
      continue; // skip pages that fail to load, keep crawling
    }

    pages.push(result);

    if (depth < maxDepth) {
      for (const link of result.links) {
        const linkNormalized = link.replace(/\/$/, '') || link;
        if (!visited.has(linkNormalized) && !queue.some((q) => q.url === link)) {
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    }
  }

  await browser.close();

  const generatedAt = new Date().toISOString();
  const pageReports = pages.map((p) => ({
    url: p.url,
    meta: p.meta,
    metrics: p.metrics,
    screenshots: p.screenshots,
    allIssues: p.allIssues,
    scorecard: buildScorecard(p.allIssues),
  }));
  const siteScorecard = averageScorecards(pageReports.map((p) => p.scorecard));

  const { markdown } = generateSiteMarkdownReport({
    startUrl,
    generatedAt,
    pages: pageReports,
    siteScorecard,
    reportDir: outputDir,
  });

  const reportPath = path.join(outputDir, `${siteSlug}-ux-ui-audit.md`);
  fs.writeFileSync(reportPath, markdown, 'utf-8');

  let pdfPath = null;
  if (generatePdf) {
    const pageReportsForHtml = pageReports.map((p) => ({
      ...p,
      screenshots: Object.fromEntries(
        Object.entries(p.screenshots).map(([vp, file]) => [vp, pathToFileURL(path.resolve(file)).href])
      ),
    }));
    const html = generateHtmlReport({
      startUrl,
      generatedAt,
      pages: pageReportsForHtml,
      siteScorecard,
    });
    pdfPath = path.join(outputDir, `${siteSlug}-ux-ui-audit.pdf`);
    if (options.keepHtml) {
      fs.writeFileSync(path.join(outputDir, `${siteSlug}-ux-ui-audit.html`), html, 'utf-8');
    }
    const hostname = (() => { try { return new URL(startUrl).hostname; } catch { return startUrl; } })();
    await renderPdf({ html, outputPath: pdfPath, hostname, executablePath });
  }

  return {
    reportPath,
    pdfPath,
    siteScorecard,
    pages: pageReports,
    pagesCrawled: pages.length,
    truncated: queue.length > 0 && pages.length >= maxPages,
    skippedError: firstError,
  };
}
