import { SEVERITY_WEIGHT } from './score.js';
import { BRAND } from './brandAssets.js';

const SEVERITY_ORDER = Object.keys(SEVERITY_WEIGHT);

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function sortIssues(issues) {
  return [...issues].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );
}

// Assigns a stable footnote number to each distinct source URL, in
// first-appearance order across the whole site (not per page).
function buildBibliography(pages) {
  const numberByUrl = new Map();
  const entries = [];
  for (const p of pages) {
    for (const issue of sortIssues(p.allIssues)) {
      for (const ref of issue.references || []) {
        if (!numberByUrl.has(ref.url)) {
          numberByUrl.set(ref.url, entries.length + 1);
          entries.push(ref);
        }
      }
    }
  }
  return { numberByUrl, entries };
}

function scoreRing(score) {
  const angle = Math.round((score / 100) * 360);
  return `background: conic-gradient(var(--khaki) ${angle}deg, rgba(255,255,255,0.16) ${angle}deg);`;
}

function pagePathLabel(url, startUrl) {
  try {
    const u = new URL(url);
    return (u.pathname === '/' || u.pathname === '') ? '/' : u.pathname + u.search;
  } catch {
    return url;
  }
}

function issueCard(issue, numberByUrl) {
  const nums = (issue.references || []).map((r) => numberByUrl.get(r.url));
  const sup = nums.length
    ? `<sup class="cites">[${nums.map((n) => `<a href="#ref-${n}">${n}</a>`).join(',')}]</sup>`
    : '';
  return `
    <article class="issue sev-${issue.severity.toLowerCase()}">
      <div class="issue-stripe" aria-hidden="true"></div>
      <div class="issue-body">
        <div class="issue-head">
          <span class="sev-pill">${esc(issue.severity)}</span>
          <h3>${esc(issue.title)}</h3>
        </div>
        <p class="issue-desc">${esc(issue.description)}${sup}</p>
        <div class="issue-meta">
          <span><strong>Norm</strong> ${esc(issue.norm)}</span>
          <span><strong>Affected elements</strong> ${esc(issue.affectedElements ?? 'N/A')}</span>
        </div>
        ${issue.sample ? `<pre class="sample">${esc(issue.sample.replace(/\n/g, ' '))}</pre>` : ''}
      </div>
    </article>`;
}

function marker(n) {
  return `<span class="marker">${String(n).padStart(2, '0')}</span>`;
}

export function generateHtmlReport({ startUrl, generatedAt, pages, siteScorecard }) {
  const { numberByUrl, entries: bibliography } = buildBibliography(pages);
  const allIssues = pages.flatMap((p) => p.allIssues);
  const topIssues = sortIssues(allIssues)
    .filter((i) => i.severity === 'Critical' || i.severity === 'High')
    .slice(0, 8);

  const hostname = (() => { try { return new URL(startUrl).hostname; } catch { return startUrl; } })();
  const dateLabel = new Date(generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const startPage = pages[0];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>UX/UI Site Audit — ${esc(hostname)}</title>
<style>
  @font-face {
    font-family: 'DIN Next LT Pro';
    font-weight: 700;
    src: url(${BRAND.fontDinBoldCondensed}) format('opentype');
  }
  @font-face {
    font-family: 'Spock Striked';
    font-weight: 400;
    src: url(${BRAND.fontSpockStriked}) format('opentype');
  }

  :root {
    --black: #141414;
    --white: #FFFFFF;
    --ink: #141414;
    --grey: #6E6E6E;
    --grey-line: #DADADA;
    --grey-line-dark: rgba(255,255,255,0.2);
    --khaki: #6B6A45;
    --khaki-tint: #EBEAE0;
    --sev-critical: #96382B; --sev-critical-tint: #F1E1DD;
    --sev-high: #A8621E;     --sev-high-tint: #F3E5D4;
    --sev-medium: #7C6A22;   --sev-medium-tint: #EFEAD2;
    --sev-low: #3F5A63;      --sev-low-tint: #DEE7EA;
    --font-display: 'Spock Striked', Georgia, serif;
    --font-label: 'DIN Next LT Pro', Arial, sans-serif;
    --font-body: 'Liberation Sans', 'Helvetica Neue', Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { background: var(--white); color: var(--ink); font-family: var(--font-body); font-size: 10pt; line-height: 1.55; }
  h1, h2, h3 { margin: 0; font-weight: 400; text-wrap: balance; }
  a { color: var(--khaki); }
  .page { padding: 18mm 16mm 16mm; min-height: 263mm; position: relative; }
  .page-break { break-after: page; }
  .label {
    font-family: var(--font-label); font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; font-size: 8pt;
  }
  .eyebrow { font-family: var(--font-label); font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; font-size: 8.5pt; }
  .eyebrow .rule { display: inline-block; width: 14px; height: 2px; background: var(--khaki); margin-left: 6px; vertical-align: middle; }

  /* ---- Cover ---- */
  .cover { background: var(--black); color: var(--white); display: flex; flex-direction: column; justify-content: space-between; }
  .cover .eyebrow { color: var(--khaki); }
  /* The keyline lockup is black line-art on a transparent ground, drawn for
     light backgrounds — give it a white card wherever it sits on dark pages. */
  .logo-chip { display: inline-block; background: var(--white); padding: 2.5mm 4mm; line-height: 0; }
  .cover .logo-chip { margin-bottom: 14mm; }
  .cover-logo { height: 9mm; display: block; }
  .cover-title { font-family: var(--font-display); font-size: 46pt; line-height: 1.05; letter-spacing: 0.01em; margin: 6mm 0 4mm; max-width: 160mm; }
  .cover-url { font-family: var(--font-label); font-size: 9.5pt; letter-spacing: 0.04em; color: rgba(255,255,255,0.72); }
  .cover-desc { font-size: 9.5pt; color: rgba(255,255,255,0.6); margin-top: 4mm; max-width: 110mm; }

  .cover-score { display: flex; align-items: center; gap: 14mm; margin: 10mm 0; }
  .ring { width: 44mm; height: 44mm; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ring-inner { width: 34mm; height: 34mm; border-radius: 50%; background: var(--black); border: 0.5pt solid rgba(255,255,255,0.25); display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .ring-inner .grade { font-family: var(--font-label); font-weight: 700; font-size: 22pt; line-height: 1; }
  .ring-inner .score { font-family: var(--font-label); font-size: 7.5pt; letter-spacing: 0.06em; color: rgba(255,255,255,0.6); margin-top: 1.5mm; }
  .cover-bars { display: flex; flex-direction: column; gap: 4mm; flex: 1; }
  .bar-row { display: grid; grid-template-columns: 42mm 1fr 12mm; align-items: center; gap: 4mm; }
  .bar-label { font-family: var(--font-label); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; font-size: 8pt; color: rgba(255,255,255,0.75); }
  .bar-track { height: 1.6mm; background: rgba(255,255,255,0.16); }
  .bar-fill { height: 100%; background: var(--khaki); }
  .bar-score { font-family: var(--font-label); font-weight: 700; font-size: 9pt; text-align: right; }

  .cover-foot { display: flex; justify-content: space-between; align-items: flex-end; border-top: 0.3pt solid rgba(255,255,255,0.25); padding-top: 4mm; }
  .cover-foot .note { font-size: 7.5pt; color: rgba(255,255,255,0.5); max-width: 110mm; }
  .cover-foot .meta { font-family: var(--font-label); font-size: 7.5pt; letter-spacing: 0.05em; color: rgba(255,255,255,0.5); text-align: right; }

  /* ---- Section headers ---- */
  .section-head { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 0.5pt solid var(--ink); padding-bottom: 3mm; margin-bottom: 6mm; }
  .section-head h2 { font-family: var(--font-label); font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; font-size: 15pt; }
  .section-head .count { font-family: var(--font-label); font-size: 8pt; color: var(--grey); letter-spacing: 0.05em; }

  /* ---- Spec rows (mirrors the label / hairline-rule documentation layout) ---- */
  .spec-row { display: grid; grid-template-columns: 42mm 1fr; gap: 6mm; padding: 3.5mm 0; border-bottom: 0.4pt solid var(--grey-line); }
  .spec-row .k { font-family: var(--font-label); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 7.5pt; color: var(--grey); }

  table { width: 100%; border-collapse: collapse; margin-bottom: 8mm; }
  th, td { text-align: left; padding: 2.8mm 3mm; font-size: 9pt; border-bottom: 0.4pt solid var(--grey-line); }
  th { font-family: var(--font-label); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; font-size: 7pt; color: var(--grey); }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--font-label); font-weight: 700; }

  /* ---- Priority list, mirrors the guide's numbered-marker + connector-line device ---- */
  .priority-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3mm; }
  .priority-list li { display: flex; align-items: center; gap: 4mm; }
  .marker {
    font-family: var(--font-label); font-weight: 700; font-size: 8pt;
    width: 7mm; height: 7mm; border-radius: 50%; background: var(--khaki); color: var(--white);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .connector { width: 5mm; height: 0.3pt; background: var(--ink); flex-shrink: 0; }
  .priority-list .txt { flex: 1; font-size: 9.5pt; }
  .priority-list .cat { font-family: var(--font-label); font-size: 7.5pt; color: var(--grey); text-transform: uppercase; letter-spacing: 0.05em; }
  .priority-list .sev-pill { flex-shrink: 0; }

  /* ---- Issue cards ---- */
  .issue { display: flex; break-inside: avoid; margin-bottom: 4.5mm; background: #FAFAF8; }
  .issue-stripe { width: 1.6mm; flex-shrink: 0; }
  .sev-critical .issue-stripe { background: var(--sev-critical); }
  .sev-high .issue-stripe { background: var(--sev-high); }
  .sev-medium .issue-stripe { background: var(--sev-medium); }
  .sev-low .issue-stripe { background: var(--sev-low); }
  .issue-body { padding: 3.5mm 4.5mm; flex: 1; }
  .issue-head { display: flex; align-items: baseline; gap: 3mm; margin-bottom: 1.5mm; }
  .issue-head h3 { font-family: var(--font-body); font-weight: 700; font-size: 11pt; }
  .sev-pill { font-family: var(--font-label); font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.7mm 2mm; flex-shrink: 0; }
  .sev-critical .sev-pill { background: var(--sev-critical-tint); color: var(--sev-critical); }
  .sev-high .sev-pill { background: var(--sev-high-tint); color: var(--sev-high); }
  .sev-medium .sev-pill { background: var(--sev-medium-tint); color: var(--sev-medium); }
  .sev-low .sev-pill { background: var(--sev-low-tint); color: var(--sev-low); }
  .issue-desc { color: #4A4A46; margin: 0 0 2mm; font-size: 9.5pt; }
  .cites { font-family: var(--font-label); font-size: 7pt; color: var(--khaki); margin-left: 0.5mm; }
  .cites a { text-decoration: none; color: var(--khaki); }
  .issue-meta { display: flex; gap: 6mm; font-size: 8pt; color: var(--grey); }
  .issue-meta strong { color: var(--ink); font-weight: 700; margin-right: 1mm; font-family: var(--font-label); font-size: 7pt; text-transform: uppercase; letter-spacing: 0.05em; }
  .sample { font-family: 'Liberation Mono', 'DejaVu Sans Mono', Consolas, monospace; font-size: 7.5pt; background: var(--black); color: #D8D6C8; padding: 2mm 3mm; margin: 2mm 0 0; white-space: pre-wrap; word-break: break-word; }

  /* ---- Page findings header ---- */
  .page-banner { display: flex; align-items: center; justify-content: space-between; padding-bottom: 3mm; margin-bottom: 6mm; border-bottom: 0.5pt solid var(--ink); }
  .page-banner .path { font-family: var(--font-label); font-weight: 700; font-size: 14pt; text-transform: uppercase; }
  .page-banner .url { font-size: 8pt; color: var(--grey); margin-top: 1mm; }
  .page-banner .badge { display: flex; align-items: center; gap: 3mm; }
  .page-banner .badge .grade { font-family: var(--font-label); font-weight: 700; font-size: 20pt; }
  .page-banner .badge .score { font-family: var(--font-label); font-size: 7.5pt; color: var(--grey); text-align: right; }

  /* ---- Screenshots ---- */
  .shots { display: flex; gap: 5mm; align-items: flex-start; }
  .shot { flex: 1; }
  .shot figcaption { font-family: var(--font-label); font-weight: 700; font-size: 7.5pt; color: var(--grey); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2mm; }
  .shot img { width: 100%; border: 0.4pt solid var(--grey-line); display: block; }

  /* ---- Bibliography ---- */
  .bib { list-style: none; margin: 0; padding: 0; }
  .bib li { display: flex; gap: 3mm; padding: 2.2mm 0; border-bottom: 0.4pt solid var(--grey-line); font-size: 8.5pt; }
  .bib .n { font-family: var(--font-label); font-weight: 700; color: var(--khaki); width: 7mm; flex-shrink: 0; }
  .bib a { word-break: break-all; color: var(--ink); }

  .metrics-note { font-size: 8pt; color: var(--grey); margin-top: 6mm; border-top: 0.4pt solid var(--grey-line); padding-top: 4mm; }

  /* ---- Colophon (back page) ---- */
  .colophon { background: var(--black); color: rgba(255,255,255,0.6); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8mm; }
  .colophon .logo-chip { padding: 4mm 6mm; }
  .colophon img { height: 11mm; display: block; }
  .colophon .legal { font-size: 7.5pt; max-width: 90mm; line-height: 1.7; }
  .colophon .site { font-family: var(--font-label); font-size: 8pt; letter-spacing: 0.05em; color: var(--khaki); }
</style>
</head>
<body>

  <section class="page cover page-break">
    <div>
      <div class="logo-chip"><img class="cover-logo" src="${BRAND.wordmark}" alt="Mad River"></div>
      <div class="eyebrow">UX / UI Site Audit<span class="rule"></span></div>
      <h1 class="cover-title">${esc(hostname)}</h1>
      <div class="cover-url">${esc(startUrl)}</div>
      <div class="cover-desc">Automated inspection against WCAG 2.1 AA, Nielsen's usability heuristics, and
      established responsive/performance benchmarks, crawled across ${pages.length} page${pages.length === 1 ? '' : 's'}
      of the site. Every finding is cited to source — see References.</div>
    </div>

    <div class="cover-score">
      <div class="ring" style="${scoreRing(siteScorecard.overallScore)}">
        <div class="ring-inner">
          <div class="grade">${siteScorecard.overallGrade}</div>
          <div class="score">${siteScorecard.overallScore} / 100</div>
        </div>
      </div>
      <div class="cover-bars">
        ${Object.entries(siteScorecard.byCategory).map(([cat, d]) => `
        <div class="bar-row">
          <div class="bar-label">${esc(cat)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${d.score}%"></div></div>
          <div class="bar-score">${d.score}</div>
        </div>`).join('')}
      </div>
    </div>

    <div class="cover-foot">
      <div class="note">Site-wide average across all crawled pages. Not a substitute for manual usability testing.</div>
      <div class="meta">Generated ${esc(dateLabel)}<br>UX/UI Site Audit / Ver 1.0</div>
    </div>
  </section>

  <section class="page page-break">
    <div class="section-head"><h2>Executive Summary</h2><span class="count">${allIssues.length} findings across ${pages.length} page${pages.length === 1 ? '' : 's'}</span></div>

    ${Object.entries(siteScorecard.byCategory).map(([cat, d]) => `
    <div class="spec-row">
      <div class="k">${esc(cat)}</div>
      <div>${d.score}/100 &nbsp;·&nbsp; Grade ${d.grade} &nbsp;·&nbsp; ${d.issueCount} issue${d.issueCount === 1 ? '' : 's'}</div>
    </div>`).join('')}

    <div class="eyebrow" style="margin: 8mm 0 3mm;">Pages Crawled<span class="rule"></span></div>
    <table>
      <thead><tr><th>Page</th><th class="num">Score</th><th class="num">Grade</th><th class="num">Issues</th></tr></thead>
      <tbody>
        ${pages.map((p) => `
        <tr><td>${esc(pagePathLabel(p.url, startUrl))}</td><td class="num">${p.scorecard.overallScore}/100</td><td class="num">${p.scorecard.overallGrade}</td><td class="num">${p.allIssues.length}</td></tr>`).join('')}
      </tbody>
    </table>

    ${topIssues.length ? `
    <div class="eyebrow" style="margin-bottom:4mm;">Priority Recommendations<span class="rule"></span></div>
    <ol class="priority-list">
      ${topIssues.map((issue, i) => `
      <li>
        ${marker(i + 1)}
        <div class="connector"></div>
        <span class="sev-pill sev-${issue.severity.toLowerCase()}" style="background:var(--sev-${issue.severity.toLowerCase()}-tint); color:var(--sev-${issue.severity.toLowerCase()})">${esc(issue.severity)}</span>
        <span class="txt">${esc(issue.title)} <span class="cat">— ${esc(issue.category)}</span></span>
      </li>`).join('')}
    </ol>` : ''}

    ${startPage?.screenshots && Object.keys(startPage.screenshots).length ? `
    <div class="eyebrow" style="margin: 8mm 0 3mm;">Captured Viewports — Homepage<span class="rule"></span></div>
    <div class="shots">
      ${Object.entries(startPage.screenshots).map(([vp, file]) => `
      <figure class="shot">
        <figcaption>${esc(vp)}</figcaption>
        <img src="${esc(file)}" alt="${esc(vp)} screenshot">
      </figure>`).join('')}
    </div>` : ''}
  </section>

  ${pages.map((p, pageIdx) => `
  <section class="page page-break">
    <div class="page-banner">
      <div>
        <div class="path">${esc(pagePathLabel(p.url, startUrl))}</div>
        <div class="url">${esc(p.url)} &nbsp;·&nbsp; Page ${pageIdx + 1} of ${pages.length}</div>
      </div>
      <div class="badge">
        <div class="score">${p.allIssues.length} finding${p.allIssues.length === 1 ? '' : 's'}<br>${p.scorecard.overallScore}/100</div>
        <div class="grade">${p.scorecard.overallGrade}</div>
      </div>
    </div>
    ${(() => {
      const byCategory = {};
      for (const issue of sortIssues(p.allIssues)) {
        byCategory[issue.category] = byCategory[issue.category] || [];
        byCategory[issue.category].push(issue);
      }
      const cats = Object.entries(byCategory);
      if (!cats.length) return '<p style="color:var(--grey); font-size:9.5pt;">No issues found on this page.</p>';
      return cats.map(([category, issues]) => `
      <div class="label" style="color:var(--grey); margin: 5mm 0 2.5mm;">${esc(category)}</div>
      ${issues.map((issue) => issueCard(issue, numberByUrl)).join('')}`).join('');
    })()}
  </section>`).join('')}

  <section class="page page-break">
    <div class="section-head"><h2>References</h2><span class="count">${bibliography.length} sources</span></div>
    <ol class="bib">
      ${bibliography.map((ref, i) => `
      <li id="ref-${i + 1}"><span class="n">[${i + 1}]</span><span>${esc(ref.title)} — <a href="${esc(ref.url)}">${esc(ref.url)}</a></span></li>`).join('')}
    </ol>
    <p class="metrics-note">Generated by ux-ui-auditor, an automated inspection tool. It surfaces a meaningful, well-established
    subset of UX/UI issues but does not replace manual usability testing with real users or a full manual WCAG audit.</p>
  </section>

  <section class="page colophon">
    <div class="logo-chip"><img src="${BRAND.wordmark}" alt="Mad River"></div>
    <div class="site">UX / UI SITE AUDIT — ${esc(hostname)}</div>
    <div class="legal">This report was generated automatically and is intended as a first-pass diagnostic aid,
    not a substitute for manual usability testing or a full manual WCAG audit.<br>Generated ${esc(dateLabel)}.</div>
  </section>

</body>
</html>`;
}
