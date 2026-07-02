const THRESHOLDS = {
  loadMs: { warn: 3000, fail: 5000 }, // Google/industry rule of thumb for perceived-fast pages
  requestCount: { warn: 80, fail: 150 },
  transferKb: { warn: 2000, fail: 4000 },
};

/**
 * Collects navigation timing and resource-weight metrics as a proxy for
 * perceived performance, a core pillar of UX.
 */
export async function runPerformanceCheck(page) {
  const issues = [];

  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav) return null;
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      loadComplete: Math.round(nav.loadEventEnd),
      ttfb: Math.round(nav.responseStart - nav.requestStart),
    };
  });

  const resources = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    const totalBytes = entries.reduce((sum, e) => sum + (e.transferSize || 0), 0);
    return { count: entries.length, totalBytes };
  });

  const transferKb = Math.round(resources.totalBytes / 1024);

  if (timing) {
    if (timing.loadComplete >= THRESHOLDS.loadMs.fail) {
      issues.push({
        category: 'Performance',
        severity: 'High',
        title: `Full page load took ${timing.loadComplete}ms`,
        description:
          'Pages that take longer than 5 seconds to load see substantially higher bounce rates. Users perceive delay as unresponsiveness, undermining trust.',
        norm: 'Web performance / Core Web Vitals guidance',
        affectedElements: 1,
      });
    } else if (timing.loadComplete >= THRESHOLDS.loadMs.warn) {
      issues.push({
        category: 'Performance',
        severity: 'Medium',
        title: `Full page load took ${timing.loadComplete}ms`,
        description:
          'Load time exceeds the ~3 second threshold generally associated with acceptable perceived performance.',
        norm: 'Web performance / Core Web Vitals guidance',
        affectedElements: 1,
      });
    }
  }

  if (resources.count >= THRESHOLDS.requestCount.fail) {
    issues.push({
      category: 'Performance',
      severity: 'Medium',
      title: `Page issued ${resources.count} network requests`,
      description:
        'A high request count increases the chance of slow or blocking resources and adds latency, especially on constrained mobile connections.',
      norm: 'Web performance best practice',
      affectedElements: resources.count,
    });
  }

  if (transferKb >= THRESHOLDS.transferKb.fail) {
    issues.push({
      category: 'Performance',
      severity: 'Medium',
      title: `Total transferred page weight is ~${transferKb}KB`,
      description:
        'Heavy pages cost users time and data, particularly on mobile networks, and correlate with higher abandonment.',
      norm: 'Web performance best practice',
      affectedElements: 1,
    });
  }

  return {
    metrics: { ...timing, requestCount: resources.count, transferKb },
    issues,
  };
}
