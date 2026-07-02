import fs from 'node:fs';
import { createRequire } from 'node:module';
import { REFERENCES } from '../report/references.js';

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf-8');

const IMPACT_TO_SEVERITY = {
  critical: 'Critical',
  serious: 'High',
  moderate: 'Medium',
  minor: 'Low',
};

/**
 * Runs an axe-core accessibility scan (WCAG 2.1 A/AA) against the loaded page.
 */
export async function runAccessibilityCheck(page) {
  await page.evaluate(axeSource);
  const results = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    return await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      },
    });
  });

  const issues = results.violations.map((violation) => ({
    id: violation.id,
    category: 'Accessibility',
    severity: IMPACT_TO_SEVERITY[violation.impact] || 'Medium',
    title: violation.help,
    description: violation.description,
    norm: `WCAG: ${(violation.tags.filter((t) => /^wcag/.test(t)).join(', ')) || 'best-practice'}`,
    helpUrl: violation.helpUrl,
    references: [
      { title: `Deque axe-core rule: ${violation.help}`, url: violation.helpUrl },
      REFERENCES.wcagQuickRef,
    ],
    affectedElements: violation.nodes.length,
    sample: violation.nodes[0]?.html?.slice(0, 200),
  }));

  return {
    passCount: results.passes.length,
    violationCount: results.violations.length,
    incompleteCount: results.incomplete.length,
    issues,
  };
}
