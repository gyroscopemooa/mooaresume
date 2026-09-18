import type { Locale } from './i18n';
export function countDisplayLength(text: string, locale: Locale) {
  return locale === 'en' ? (text.trim().match(/\S+/g)?.length ?? 0) : [...text.replace(/\s/g, '')].length;
}
export function escapeHtml(text: string) { return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }
export type ResumeDraft = { name: string; email: string; headline: string; experience: string; education: string; skills: string };
export const emptyResume: ResumeDraft = { name: '', email: '', headline: '', experience: '', education: '', skills: '' };
export function resumeHtml(draft: ResumeDraft, labels: { experience: string; education: string; skills: string }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:20mm}body{font-family:Arial,sans-serif;color:#203b35;line-height:1.65;font-size:12pt}h1{font-size:28pt;margin-bottom:0}h2{font-size:14pt;border-bottom:1px solid #abc9bb;padding-bottom:8px}p{white-space:pre-wrap;overflow-wrap:anywhere}section{break-inside:auto}h2{break-after:avoid}</style></head><body><h1>${escapeHtml(draft.name)}</h1><p>${escapeHtml(draft.email)}</p><p>${escapeHtml(draft.headline)}</p>${(['experience','education','skills'] as const).filter(key => draft[key].trim()).map(key => `<section><h2>${escapeHtml(labels[key])}</h2><p>${escapeHtml(draft[key])}</p></section>`).join('')}</body></html>`;
}
