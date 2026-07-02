import { buildScorecard, SEVERITY_WEIGHT } from './score.js';

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

// Assigns a stable footnote number to each distinct source URL, in first-appearance order.
function buildBibliography(sortedIssues) {
  const numberByUrl = new Map();
  const entries = [];
  for (const issue of sortedIssues) {
    for (const ref of issue.references || []) {
      if (!numberByUrl.has(ref.url)) {
        numberByUrl.set(ref.url, entries.length + 1);
        entries.push(ref);
      }
    }
  }
  return { numberByUrl, entries };
}

function scoreRing(score) {
  const angle = Math.round((score / 100) * 360);
  return `background: conic-gradient(var(--accent) ${angle}deg, var(--rule) ${angle}deg);`;
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

export function generateHtmlReport({ url, generatedAt, meta, metrics, screenshots, allIssues }) {
  const scorecard = buildScorecard(allIssues);
  const sorted = sortIssues(allIssues);
  const topIssues = sorted.filter((i) => i.severity === 'Critical' || i.severity === 'High').slice(0, 8);
  const { numberByUrl, entries: bibliography } = buildBibliography(sorted);

  const byCategory = {};
  for (const issue of sorted) {
    byCategory[issue.category] = byCategory[issue.category] || [];
    byCategory[issue.category].push(issue);
  }

  const hostname = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  const dateLabel = new Date(generatedAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>UX/UI Audit — ${esc(hostname)}</title>
<style>
  :root {
    --paper: #F5F5F0;
    --paper-raised: #FBFBF8;
    --ink: #1C1B1E;
    --ink-soft: #55524A;
    --rule: #D9D6CC;
    --accent: #33314F;
    --accent-tint: #E8E6F0;
    --sev-critical: #A3291F;   --sev-critical-tint: #F3E3E0;
    --sev-high: #B5651D;       --sev-high-tint: #F5E7D6;
    --sev-medium: #8C6D1B;     --sev-medium-tint: #F1EAD3;
    --sev-low: #3D6C82;        --sev-low-tint: #E1EAEE;
    --font-display: "Bitstream Charter", Georgia, "Iowan Old Style", "Times New Roman", serif;
    --font-body: "Liberation Sans", "Helvetica Neue", Arial, sans-serif;
    --font-mono: "Liberation Mono", "DejaVu Sans Mono", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-body);
    font-size: 10.5pt;
    line-height: 1.55;
  }
  h1, h2, h3 { font-family: var(--font-display); font-weight: 700; text-wrap: balance; margin: 0; }
  .eyebrow {
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 8.5pt;
    color: var(--accent);
  }
  a { color: var(--accent); }
  .page { padding: 4mm 2mm; }
  .page-break { break-after: page; }

  /* ---- Cover ---- */
  .cover {
    min-height: 235mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .cover-top .eyebrow { margin-bottom: 10mm; }
  .cover-top h1 { font-size: 34pt; line-height: 1.08; max-width: 140mm; }
  .cover-url { font-family: var(--font-mono); font-size: 10pt; color: var(--ink-soft); margin-top: 5mm; }
  .cover-meta { font-size: 9.5pt; color: var(--ink-soft); margin-top: 3mm; }

  .cover-score { display: flex; align-items: center; gap: 14mm; margin: 12mm 0; }
  .ring {
    width: 46mm; height: 46mm; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ring-inner {
    width: 36mm; height: 36mm; border-radius: 50%;
    background: var(--paper-raised);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .ring-inner .grade { font-family: var(--font-display); font-size: 22pt; font-weight: 700; line-height: 1; }
  .ring-inner .score { font-family: var(--font-mono); font-size: 8pt; color: var(--ink-soft); margin-top: 1.5mm; }
  .cover-bars { display: flex; flex-direction: column; gap: 4mm; flex: 1; }
  .bar-row { display: grid; grid-template-columns: 42mm 1fr 12mm; align-items: center; gap: 4mm; }
  .bar-label { font-size: 8.5pt; color: var(--ink-soft); }
  .bar-track { height: 2.2mm; background: var(--rule); border-radius: 2mm; overflow: hidden; }
  .bar-fill { height: 100%; background: var(--accent); }
  .bar-score { font-family: var(--font-mono); font-size: 8.5pt; text-align: right; font-variant-numeric: tabular-nums; }

  .cover-bottom { border-top: 0.5pt solid var(--rule); padding-top: 4mm; font-size: 8pt; color: var(--ink-soft); }

  /* ---- Section headers ---- */
  .section-head {
    display: flex; align-items: baseline; justify-content: space-between;
    border-bottom: 0.75pt solid var(--ink); padding-bottom: 2.5mm; margin-bottom: 6mm;
  }
  .section-head h2 { font-size: 18pt; }
  .section-head .count { font-family: var(--font-mono); font-size: 9pt; color: var(--ink-soft); }

  /* ---- Scorecard table ---- */
  table { width: 100%; border-collapse: collapse; margin-bottom: 8mm; }
  th, td { text-align: left; padding: 2.8mm 3mm; font-size: 9.5pt; border-bottom: 0.5pt solid var(--rule); }
  th { font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em; font-size: 7.5pt; color: var(--ink-soft); font-weight: 400; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--font-mono); }

  /* ---- Priority list ---- */
  .priority-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2.5mm; }
  .priority-list li { display: flex; align-items: baseline; gap: 3mm; padding: 3mm; background: var(--paper-raised); border-radius: 1.5mm; }
  .priority-list .idx { font-family: var(--font-mono); color: var(--ink-soft); font-size: 8.5pt; width: 5mm; }
  .priority-list .cat { font-family: var(--font-mono); font-size: 7.5pt; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.05em; }

  /* ---- Issue cards ---- */
  .issue { display: flex; break-inside: avoid; margin-bottom: 4.5mm; background: var(--paper-raised); border-radius: 1.5mm; overflow: hidden; }
  .issue-stripe { width: 2mm; flex-shrink: 0; }
  .sev-critical .issue-stripe { background: var(--sev-critical); }
  .sev-high .issue-stripe { background: var(--sev-high); }
  .sev-medium .issue-stripe { background: var(--sev-medium); }
  .sev-low .issue-stripe { background: var(--sev-low); }
  .issue-body { padding: 3.5mm 4.5mm; flex: 1; }
  .issue-head { display: flex; align-items: baseline; gap: 3mm; margin-bottom: 1.5mm; }
  .issue-head h3 { font-size: 11.5pt; }
  .sev-pill {
    font-family: var(--font-mono); font-size: 7pt; text-transform: uppercase; letter-spacing: 0.05em;
    padding: 0.6mm 2mm; border-radius: 3mm; flex-shrink: 0;
  }
  .sev-critical .sev-pill { background: var(--sev-critical-tint); color: var(--sev-critical); }
  .sev-high .sev-pill { background: var(--sev-high-tint); color: var(--sev-high); }
  .sev-medium .sev-pill { background: var(--sev-medium-tint); color: var(--sev-medium); }
  .sev-low .sev-pill { background: var(--sev-low-tint); color: var(--sev-low); }
  .issue-desc { color: var(--ink-soft); margin: 0 0 2mm; font-size: 9.5pt; }
  .cites { font-family: var(--font-mono); font-size: 7pt; color: var(--accent); margin-left: 0.5mm; }
  .cites a { text-decoration: none; color: var(--accent); }
  .issue-meta { display: flex; gap: 6mm; font-size: 8pt; color: var(--ink-soft); }
  .issue-meta strong { color: var(--ink); font-weight: 600; margin-right: 1mm; }
  .sample { font-family: var(--font-mono); font-size: 7.5pt; background: var(--accent-tint); color: var(--accent); padding: 2mm 3mm; border-radius: 1mm; margin: 2mm 0 0; white-space: pre-wrap; word-break: break-word; }

  /* ---- Screenshots ---- */
  .shots { display: flex; gap: 5mm; align-items: flex-start; }
  .shot { flex: 1; }
  .shot figcaption { font-family: var(--font-mono); font-size: 8pt; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2mm; }
  .shot img { width: 100%; border: 0.5pt solid var(--rule); border-radius: 1mm; display: block; }

  /* ---- Bibliography ---- */
  .bib { list-style: none; margin: 0; padding: 0; counter-reset: bib; }
  .bib li { display: flex; gap: 3mm; padding: 2mm 0; border-bottom: 0.5pt solid var(--rule); font-size: 9pt; }
  .bib .n { font-family: var(--font-mono); color: var(--ink-soft); width: 6mm; flex-shrink: 0; }
  .bib a { word-break: break-all; }

  .metrics-note { font-size: 8.5pt; color: var(--ink-soft); margin-top: 6mm; border-top: 0.5pt solid var(--rule); padding-top: 4mm; }
</style>
</head>
<body>

  <section class="page cover page-break">
    <div class="cover-top">
      <div class="eyebrow">UX / UI Inspection Report</div>
      <h1>${esc(hostname)}</h1>
      <div class="cover-url">${esc(url)}</div>
      <div class="cover-meta">Generated ${esc(dateLabel)} &nbsp;·&nbsp; Page title: ${esc(meta.title || '(none)')}</div>
    </div>

    <div class="cover-score">
      <div class="ring" style="${scoreRing(scorecard.overallScore)}">
        <div class="ring-inner">
          <div class="grade">${scorecard.overallGrade}</div>
          <div class="score">${scorecard.overallScore} / 100</div>
        </div>
      </div>
      <div class="cover-bars">
        ${Object.entries(scorecard.byCategory).map(([cat, d]) => `
        <div class="bar-row">
          <div class="bar-label">${esc(cat)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${d.score}%"></div></div>
          <div class="bar-score">${d.score}</div>
        </div>`).join('')}
      </div>
    </div>

    <div class="cover-bottom">
      Automated inspection against WCAG 2.1 AA, Nielsen's usability heuristics, and established responsive/performance
      benchmarks. Findings are cited to source (see References). Not a substitute for manual usability testing.
    </div>
  </section>

  <section class="page page-break">
    <div class="section-head"><h2>Executive Summary</h2><span class="count">${allIssues.length} findings</span></div>
    <table>
      <thead><tr><th>Category</th><th class="num">Score</th><th class="num">Grade</th><th class="num">Issues</th></tr></thead>
      <tbody>
        ${Object.entries(scorecard.byCategory).map(([cat, d]) => `
        <tr><td>${esc(cat)}</td><td class="num">${d.score}/100</td><td class="num">${d.grade}</td><td class="num">${d.issueCount}</td></tr>`).join('')}
      </tbody>
    </table>

    ${topIssues.length ? `
    <div class="eyebrow" style="margin-bottom:3mm;">Priority Recommendations</div>
    <ol class="priority-list">
      ${topIssues.map((issue, i) => `
      <li>
        <span class="idx">${String(i + 1).padStart(2, '0')}</span>
        <span class="sev-pill sev-${issue.severity.toLowerCase()}" style="background:var(--sev-${issue.severity.toLowerCase()}-tint); color:var(--sev-${issue.severity.toLowerCase()})">${esc(issue.severity)}</span>
        <span>${esc(issue.title)} <span class="cat">— ${esc(issue.category)}</span></span>
      </li>`).join('')}
    </ol>` : ''}

    ${screenshots && Object.keys(screenshots).length ? `
    <div class="eyebrow" style="margin: 8mm 0 3mm;">Captured Viewports</div>
    <div class="shots">
      ${Object.entries(screenshots).map(([vp, file]) => `
      <figure class="shot">
        <figcaption>${esc(vp)}</figcaption>
        <img src="${esc(file)}" alt="${esc(vp)} screenshot">
      </figure>`).join('')}
    </div>` : ''}
  </section>

  ${Object.entries(byCategory).map(([category, issues]) => `
  <section class="page page-break">
    <div class="section-head"><h2>${esc(category)}</h2><span class="count">${issues.length} finding${issues.length === 1 ? '' : 's'}</span></div>
    ${issues.map((issue) => issueCard(issue, numberByUrl)).join('')}
  </section>`).join('')}

  <section class="page">
    <div class="section-head"><h2>Performance Metrics</h2></div>
    <table>
      <tbody>
        <tr><td>DOM Content Loaded</td><td class="num">${metrics.domContentLoaded ?? 'N/A'} ms</td></tr>
        <tr><td>Full page load</td><td class="num">${metrics.loadComplete ?? 'N/A'} ms</td></tr>
        <tr><td>Time to first byte</td><td class="num">${metrics.ttfb ?? 'N/A'} ms</td></tr>
        <tr><td>Network requests</td><td class="num">${metrics.requestCount ?? 'N/A'}</td></tr>
        <tr><td>Transferred weight</td><td class="num">${metrics.transferKb ?? 'N/A'} KB</td></tr>
      </tbody>
    </table>

    <div class="eyebrow" style="margin: 8mm 0 3mm;">References</div>
    <ol class="bib">
      ${bibliography.map((ref, i) => `
      <li id="ref-${i + 1}"><span class="n">[${i + 1}]</span><span>${esc(ref.title)} — <a href="${esc(ref.url)}">${esc(ref.url)}</a></span></li>`).join('')}
    </ol>

    <p class="metrics-note">Generated by ux-ui-auditor, an automated inspection tool. It surfaces a meaningful, well-established
    subset of UX/UI issues but does not replace manual usability testing with real users or a full manual WCAG audit.</p>
  </section>

</body>
</html>`;
}
