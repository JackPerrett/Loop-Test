#!/usr/bin/env node
import { auditSite } from './audit.js';

function parseArgs(argv) {
  const args = { output: './audit-output', timeout: 30000, maxPages: 15, maxDepth: 3 };
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--output' || arg === '-o') {
      args.output = argv[++i];
    } else if (arg === '--timeout' || arg === '-t') {
      args.timeout = Number(argv[++i]);
    } else if (arg === '--no-pdf') {
      args.pdf = false;
    } else if (arg === '--single-page') {
      args.singlePage = true;
    } else if (arg === '--max-pages') {
      args.maxPages = Number(argv[++i]);
    } else if (arg === '--max-depth') {
      args.maxDepth = Number(argv[++i]);
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      positional.push(arg);
    }
  }

  args.url = positional[0];
  return args;
}

function printHelp() {
  console.log(`
UX/UI Website Auditor

Crawls a site (same-origin) starting from <url> and audits every page it
finds against WCAG 2.1 AA, Nielsen's usability heuristics, and responsive/
performance best practice, then produces one aggregated Markdown report and
one branded PDF report covering the whole site.

Usage:
  node src/cli.js <url> [options]

Options:
  -o, --output <dir>     Output directory for the report and screenshots (default: ./audit-output)
  -t, --timeout <ms>     Page load timeout per page in milliseconds (default: 30000)
  --max-pages <n>        Maximum number of pages to crawl (default: 15)
  --max-depth <n>        Maximum link depth from the start URL (default: 3)
  --single-page          Audit only the given URL, no crawling
  --no-pdf               Skip generating the branded PDF report (Markdown is always written)
  -h, --help             Show this help message

Examples:
  node src/cli.js https://example.com --output ./reports/example
  node src/cli.js https://example.com --single-page
  node src/cli.js https://example.com --max-pages 40 --max-depth 4
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.url) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  let url = args.url;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  console.log(args.singlePage ? `Auditing ${url} ...` : `Crawling and auditing ${url} (up to ${args.maxPages} pages) ...`);

  try {
    const { reportPath, pdfPath, siteScorecard, pagesCrawled, truncated } = await auditSite(url, {
      outputDir: args.output,
      timeout: args.timeout,
      pdf: args.pdf,
      singlePage: args.singlePage,
      maxPages: args.maxPages,
      maxDepth: args.maxDepth,
    });

    console.log('');
    console.log(`Pages crawled: ${pagesCrawled}${truncated ? ' (stopped at --max-pages limit)' : ''}`);
    console.log(`Site score: ${siteScorecard.overallScore}/100 (${siteScorecard.overallGrade})`);
    for (const [category, data] of Object.entries(siteScorecard.byCategory)) {
      console.log(`  ${category}: ${data.score}/100 (${data.grade}) — ${data.issueCount} issue(s)`);
    }
    console.log('');
    console.log(`Markdown report: ${reportPath}`);
    if (pdfPath) console.log(`PDF report:      ${pdfPath}`);
  } catch (err) {
    console.error(`Audit failed: ${err.message}`);
    process.exit(1);
  }
}

main();
