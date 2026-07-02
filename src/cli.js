#!/usr/bin/env node
import { auditWebsite } from './audit.js';

function parseArgs(argv) {
  const args = { output: './audit-output', timeout: 30000 };
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--output' || arg === '-o') {
      args.output = argv[++i];
    } else if (arg === '--timeout' || arg === '-t') {
      args.timeout = Number(argv[++i]);
    } else if (arg === '--no-pdf') {
      args.pdf = false;
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

Usage:
  node src/cli.js <url> [options]

Options:
  -o, --output <dir>     Output directory for the report and screenshots (default: ./audit-output)
  -t, --timeout <ms>     Page load timeout in milliseconds (default: 30000)
  --no-pdf               Skip generating the designed PDF report (Markdown is always written)
  -h, --help             Show this help message

Example:
  node src/cli.js https://example.com --output ./reports/example
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

  console.log(`Auditing ${url} ...`);

  try {
    const { reportPath, pdfPath, scorecard } = await auditWebsite(url, {
      outputDir: args.output,
      timeout: args.timeout,
      pdf: args.pdf,
    });

    console.log('');
    console.log(`Overall score: ${scorecard.overallScore}/100 (${scorecard.overallGrade})`);
    for (const [category, data] of Object.entries(scorecard.byCategory)) {
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
