// Authoritative sources cited in the audit report, keyed for reuse across check modules.
// Each entry explains *why* a finding matters, not just that a rule was violated.
export const REFERENCES = {
  wcagPageTitled: { title: 'WCAG 2.1 SC 2.4.2: Page Titled', url: 'https://www.w3.org/WAI/WCAG21/Understanding/page-titled.html' },
  wcagLanguageOfPage: { title: 'WCAG 2.1 SC 3.1.1: Language of Page', url: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html' },
  wcagInfoRelationships: { title: 'WCAG 2.1 SC 1.3.1: Info and Relationships', url: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html' },
  wcagLinkPurpose: { title: 'WCAG 2.1 SC 2.4.4: Link Purpose (In Context)', url: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html' },
  wcagTargetSize: { title: 'WCAG 2.1 SC 2.5.5: Target Size', url: 'https://www.w3.org/WAI/WCAG21/Understanding/target-size.html' },
  nnVisibilitySystemStatus: { title: "Nielsen Norman Group: Visibility of System Status", url: 'https://www.nngroup.com/articles/visibility-system-status/' },
  nnTenHeuristics: { title: "Nielsen Norman Group: 10 Usability Heuristics for UI Design", url: 'https://www.nngroup.com/articles/ten-usability-heuristics/' },
  nnRecognitionRecall: { title: 'Nielsen Norman Group: Recognition vs. Recall in UX', url: 'https://www.nngroup.com/articles/recognition-and-recall/' },
  nnErrorMessages: { title: "Nielsen Norman Group: Error Message Guidelines", url: 'https://www.nngroup.com/articles/error-message-guidelines/' },
  nnTouchTargetSize: { title: "Nielsen Norman Group: Touch Targets on Touchscreens", url: 'https://www.nngroup.com/articles/touch-target-size/' },
  nnResponseTimes: { title: "Nielsen Norman Group: Response Times — The 3 Important Limits", url: 'https://www.nngroup.com/articles/response-times-3-important-limits/' },
  webaimLinkText: { title: 'WebAIM: Links and Hypertext — Link Text', url: 'https://webaim.org/techniques/hypertext/link_text' },
  googleTitleLinks: { title: 'Google Search Central: Influencing your title links', url: 'https://developers.google.com/search/docs/appearance/title-link' },
  googleSnippets: { title: 'Google Search Central: Control your snippets', url: 'https://developers.google.com/search/docs/appearance/snippet' },
  mdnViewportMeta: { title: 'MDN: Using the viewport meta tag', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Viewport_meta_tag' },
  webdevResponsive: { title: 'web.dev: Learn Responsive Design', url: 'https://web.dev/learn/design/' },
  webdevVitals: { title: 'web.dev: Core Web Vitals', url: 'https://web.dev/articles/vitals' },
  mdnRelNoopener: { title: 'MDN: rel="noopener"', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/noopener' },
  owaspTabnabbing: { title: 'OWASP: Reverse Tabnabbing', url: 'https://owasp.org/www-community/attacks/Reverse_Tabnabbing' },
  wcagQuickRef: { title: 'W3C WCAG 2.1 Quick Reference', url: 'https://www.w3.org/WAI/WCAG21/quickref/' },
};
