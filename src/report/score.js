const SEVERITY_WEIGHT = {
  Critical: 25,
  High: 12,
  Medium: 6,
  Low: 2,
};

const CATEGORIES = ['Accessibility', 'Responsive Design', 'Performance', 'Content & Structure'];

export function scoreCategory(issues) {
  const deduction = issues.reduce((sum, issue) => sum + (SEVERITY_WEIGHT[issue.severity] || 4), 0);
  return Math.max(0, Math.round(100 - deduction));
}

export function grade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function buildScorecard(allIssues) {
  const byCategory = {};
  for (const category of CATEGORIES) {
    const issues = allIssues.filter((i) => i.category === category);
    const score = scoreCategory(issues);
    byCategory[category] = { score, grade: grade(score), issueCount: issues.length };
  }
  const overallScore = Math.round(
    Object.values(byCategory).reduce((sum, c) => sum + c.score, 0) / CATEGORIES.length
  );
  return { byCategory, overallScore, overallGrade: grade(overallScore) };
}

// Averages a set of per-page scorecards into one site-level scorecard, so a
// site with many pages isn't unfairly penalised just for having more pages.
export function averageScorecards(scorecards) {
  const byCategory = {};
  for (const category of CATEGORIES) {
    const avg = Math.round(
      scorecards.reduce((sum, sc) => sum + sc.byCategory[category].score, 0) / scorecards.length
    );
    const issueCount = scorecards.reduce((sum, sc) => sum + sc.byCategory[category].issueCount, 0);
    byCategory[category] = { score: avg, grade: grade(avg), issueCount };
  }
  const overallScore = Math.round(
    scorecards.reduce((sum, sc) => sum + sc.overallScore, 0) / scorecards.length
  );
  return { byCategory, overallScore, overallGrade: grade(overallScore) };
}

export { CATEGORIES, SEVERITY_WEIGHT };
