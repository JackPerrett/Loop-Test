import { REFERENCES } from '../report/references.js';

const VAGUE_LINK_TEXT = new Set([
  'click here',
  'here',
  'read more',
  'learn more',
  'more',
  'more info',
  'link',
  'this link',
  'details',
]);

/**
 * Structural, information-architecture, and content-quality checks rooted in
 * Nielsen's usability heuristics (visibility of system status, recognition
 * over recall, consistency) and SEO/UX fundamentals.
 */
export async function runContentCheck(page) {
  const issues = [];

  const meta = await page.evaluate(() => {
    const title = document.title || '';
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const favicon = !!document.querySelector('link[rel*="icon"]');
    const lang = document.documentElement.getAttribute('lang') || '';
    return { title, description, favicon, lang };
  });

  if (!meta.title || meta.title.trim().length === 0) {
    issues.push({
      category: 'Content & Structure',
      severity: 'High',
      title: 'Missing <title> element',
      description: 'Every page needs a unique, descriptive title. It anchors browser tabs, search results, and screen reader announcements (visibility of system status).',
      norm: 'Nielsen Heuristic #1 / WCAG 2.4.2',
      references: [REFERENCES.nnVisibilitySystemStatus, REFERENCES.wcagPageTitled],
      affectedElements: 1,
    });
  } else if (meta.title.length > 60) {
    issues.push({
      category: 'Content & Structure',
      severity: 'Low',
      title: `Page title is ${meta.title.length} characters (recommended ≤ 60)`,
      description: 'Long titles get truncated in browser tabs and search engine results.',
      norm: 'SEO / usability best practice',
      references: [REFERENCES.googleTitleLinks],
      affectedElements: 1,
    });
  }

  if (!meta.description) {
    issues.push({
      category: 'Content & Structure',
      severity: 'Low',
      title: 'Missing meta description',
      description: 'A concise meta description helps users judge page relevance from search results before clicking through.',
      norm: 'SEO / usability best practice',
      references: [REFERENCES.googleSnippets],
      affectedElements: 1,
    });
  }

  if (!meta.favicon) {
    issues.push({
      category: 'Content & Structure',
      severity: 'Low',
      title: 'Missing favicon',
      description: 'A favicon helps users recognise the site among open browser tabs and bookmarks (recognition over recall).',
      norm: 'Nielsen Heuristic #6 (Recognition Rather Than Recall)',
      references: [REFERENCES.nnRecognitionRecall],
      affectedElements: 1,
    });
  }

  if (!meta.lang) {
    issues.push({
      category: 'Content & Structure',
      severity: 'Medium',
      title: 'Missing lang attribute on <html>',
      description: 'Without a declared language, screen readers may mispronounce content and translation tools may misfire.',
      norm: 'WCAG 3.1.1 Language of Page',
      references: [REFERENCES.wcagLanguageOfPage],
      affectedElements: 1,
    });
  }

  const headings = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    return els.map((el) => Number(el.tagName[1]));
  });

  const h1Count = headings.filter((level) => level === 1).length;
  if (h1Count === 0) {
    issues.push({
      category: 'Content & Structure',
      severity: 'Medium',
      title: 'No <h1> found on the page',
      description: 'Every page should have exactly one primary heading that describes its main content, supporting both scannability and screen-reader navigation.',
      norm: 'HTML5 semantics / WCAG 1.3.1',
      references: [REFERENCES.wcagInfoRelationships],
      affectedElements: 1,
    });
  } else if (h1Count > 1) {
    issues.push({
      category: 'Content & Structure',
      severity: 'Low',
      title: `${h1Count} <h1> elements found (expected 1)`,
      description: 'Multiple top-level headings dilute page hierarchy and confuse assistive technology users about the page\'s primary topic.',
      norm: 'HTML5 semantics / WCAG 1.3.1',
      references: [REFERENCES.wcagInfoRelationships],
      affectedElements: h1Count,
    });
  }

  let skippedLevels = 0;
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] - headings[i - 1] > 1) skippedLevels++;
  }
  if (skippedLevels > 0) {
    issues.push({
      category: 'Content & Structure',
      severity: 'Low',
      title: `${skippedLevels} instance(s) of skipped heading levels`,
      description: 'Heading levels jump (e.g. h2 straight to h4) without a level in between, breaking the logical outline screen-reader users rely on.',
      norm: 'WCAG 1.3.1 Info and Relationships',
      references: [REFERENCES.wcagInfoRelationships],
      affectedElements: skippedLevels,
    });
  }

  const vagueLinks = await page.evaluate((vagueSet) => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.filter((a) => vagueSet.includes(a.textContent.trim().toLowerCase())).length;
  }, Array.from(VAGUE_LINK_TEXT));

  if (vagueLinks > 0) {
    issues.push({
      category: 'Content & Structure',
      severity: 'Low',
      title: `${vagueLinks} link(s) use non-descriptive text (e.g. "click here", "read more")`,
      description: 'Link text should describe its destination out of context, since screen reader users often navigate a list of links in isolation.',
      norm: 'WCAG 2.4.4 Link Purpose (In Context)',
      references: [REFERENCES.wcagLinkPurpose, REFERENCES.webaimLinkText],
      affectedElements: vagueLinks,
    });
  }

  const brokenImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
  });

  if (brokenImages > 0) {
    issues.push({
      category: 'Content & Structure',
      severity: 'High',
      title: `${brokenImages} broken image(s) detected`,
      description: 'Images that fail to load leave visible gaps or broken-icon placeholders, damaging perceived quality and trust.',
      norm: 'Nielsen Heuristic #1 (Visibility of System Status)',
      references: [REFERENCES.nnVisibilitySystemStatus],
      affectedElements: brokenImages,
    });
  }

  const hasNav = await page.evaluate(() => !!document.querySelector('nav, [role="navigation"]'));
  if (!hasNav) {
    issues.push({
      category: 'Content & Structure',
      severity: 'Medium',
      title: 'No <nav> landmark found',
      description: 'A semantic navigation landmark helps both sighted users scanning the layout and assistive-technology users jumping between page regions.',
      norm: 'WCAG 1.3.1 Info and Relationships',
      references: [REFERENCES.wcagInfoRelationships],
      affectedElements: 1,
    });
  }

  const unsafeBlankLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[target="_blank"]'));
    return links.filter((a) => !/noopener/.test(a.getAttribute('rel') || '')).length;
  });

  if (unsafeBlankLinks > 0) {
    issues.push({
      category: 'Content & Structure',
      severity: 'Low',
      title: `${unsafeBlankLinks} link(s) open in a new tab without rel="noopener"`,
      description: 'target="_blank" links without rel="noopener" expose the page to reverse-tabnabbing and hurt performance by keeping the opener process reachable.',
      norm: 'Web security best practice',
      references: [REFERENCES.mdnRelNoopener, REFERENCES.owaspTabnabbing],
      affectedElements: unsafeBlankLinks,
    });
  }

  return { issues, meta };
}
