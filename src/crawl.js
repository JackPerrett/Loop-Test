const SKIP_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp',
  '.zip', '.rar', '.tar', '.gz', '.7z',
  '.mp4', '.mp3', '.wav', '.mov', '.avi', '.webm',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.css', '.js', '.json', '.xml', '.woff', '.woff2', '.ttf', '.otf', '.eot',
]);

/**
 * Resolves a raw href against the page it was found on and decides whether
 * it's worth queueing for a crawl: same-origin, http(s), not a fragment-only
 * link, and not pointing at a non-page asset.
 */
export function normalizeCrawlLink(rawHref, pageUrl, originHostname) {
  let url;
  try {
    url = new URL(rawHref, pageUrl);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.hostname !== originHostname) return null;

  const lastSegment = url.pathname.split('/').pop() || '';
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex !== -1) {
    const ext = lastSegment.slice(dotIndex).toLowerCase();
    if (SKIP_EXTENSIONS.has(ext)) return null;
  }

  url.hash = '';
  return url.href;
}

/**
 * Extracts and filters same-origin, crawlable links from a loaded page's
 * anchor tags. `rawHrefs` is the raw list of href attribute values.
 */
export function filterCrawlableLinks(rawHrefs, pageUrl, originHostname) {
  const seen = new Set();
  const results = [];
  for (const href of rawHrefs) {
    const normalized = normalizeCrawlLink(href, pageUrl, originHostname);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      results.push(normalized);
    }
  }
  return results;
}
