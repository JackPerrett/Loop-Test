import { REFERENCES } from '../report/references.js';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const MIN_TOUCH_TARGET = 44; // WCAG 2.5.5 / Apple & Material HIG recommendation, in CSS px
const MIN_BODY_FONT = 12; // px, below this is generally illegible on mobile

export { VIEWPORTS };

/**
 * Checks layout behaviour across common breakpoints: horizontal overflow,
 * viewport meta tag, touch target sizing, and body font size.
 */
export async function runResponsiveCheck(page, { screenshotDir, slug, captureScreenshots = true }) {
  const issues = [];
  const screenshots = {};

  const hasViewportMeta = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    return !!meta && /width\s*=\s*device-width/i.test(meta.getAttribute('content') || '');
  });

  if (!hasViewportMeta) {
    issues.push({
      category: 'Responsive Design',
      severity: 'High',
      title: 'Missing responsive viewport meta tag',
      description:
        'No <meta name="viewport" content="width=device-width, ...​"> tag was found. Without it, mobile browsers render at desktop width and scale down, producing tiny, unreadable text and unpredictable layouts.',
      norm: 'Responsive Web Design best practice',
      references: [REFERENCES.mdnViewportMeta, REFERENCES.webdevResponsive],
      affectedElements: 1,
    });
  }

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(150);

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });

    if (overflow) {
      issues.push({
        category: 'Responsive Design',
        severity: 'Medium',
        title: `Horizontal scroll/overflow at ${viewport.name} width (${viewport.width}px)`,
        description:
          'The page content is wider than the viewport, forcing horizontal scrolling. This usually indicates a fixed-width element, unconstrained image, or missing max-width: 100% rule.',
        norm: 'Responsive Web Design best practice',
        references: [REFERENCES.webdevResponsive],
        affectedElements: 1,
      });
    }

    if (viewport.name === 'mobile') {
      const smallTargets = await page.evaluate((minSize) => {
        const selector = 'a, button, input, select, textarea, [role="button"], [onclick]';
        const els = Array.from(document.querySelectorAll(selector));
        let count = 0;
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          if (rect.width < minSize || rect.height < minSize) count++;
        }
        return count;
      }, MIN_TOUCH_TARGET);

      if (smallTargets > 0) {
        issues.push({
          category: 'Responsive Design',
          severity: 'Medium',
          title: `${smallTargets} interactive element(s) smaller than the ${MIN_TOUCH_TARGET}px recommended touch target`,
          description:
            'Buttons, links, and form controls smaller than 44x44 CSS pixels are hard to tap accurately on touchscreens, a common source of mis-taps and frustration (Fitts\'s Law).',
          norm: 'WCAG 2.5.5 Target Size',
          references: [REFERENCES.wcagTargetSize, REFERENCES.nnTouchTargetSize],
          affectedElements: smallTargets,
        });
      }

      const smallFontCount = await page.evaluate((minSize) => {
        const els = Array.from(document.querySelectorAll('p, li, span, a, td, label, div'));
        let count = 0;
        for (const el of els) {
          if (!el.textContent || !el.textContent.trim()) continue;
          const size = parseFloat(getComputedStyle(el).fontSize);
          if (size && size < minSize) count++;
        }
        return count;
      }, MIN_BODY_FONT);

      if (smallFontCount > 0) {
        issues.push({
          category: 'Responsive Design',
          severity: 'Low',
          title: `${smallFontCount} text element(s) rendered below ${MIN_BODY_FONT}px on mobile`,
          description:
            'Body text smaller than ~12px is difficult to read on mobile devices and often triggers auto-zoom on iOS form inputs.',
          norm: 'Mobile typography best practice (16px+ recommended for body copy)',
          references: [REFERENCES.webdevResponsive],
          affectedElements: smallFontCount,
        });
      }
    }

    if (captureScreenshots) {
      const screenshotPath = `${screenshotDir}/${slug}-${viewport.name}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      screenshots[viewport.name] = screenshotPath;
    }
  }

  return { issues, screenshots };
}
