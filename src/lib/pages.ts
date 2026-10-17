// Helpers for the content pages (show, events, corporate events, David Bowie,
// Ziggy Stardust, shows, about, FAQ). The copy lives in
// src/content/pages.{he,en}.json; numbers that change (how many shows, how many
// cities, the next show) are filled in at build time from shows.json so the
// text can never drift out of date. Past-show totals are deliberately NOT
// computed here: the public wording is "over 70 shows" (shows.json only lists
// a selection), so no exact count is ever published.
import pagesHe from '../content/pages.he.json';
import pagesEn from '../content/pages.en.json';
import shows from '../content/shows.json';

export type Locale = 'he' | 'en';

export const pageData: Record<Locale, Record<string, any>> = { he: pagesHe, en: pagesEn };
export const slugs = Object.keys(pagesHe);

/** URL path of a content page: English at the root, Hebrew under /he/. */
export function pagePath(locale: Locale, slug: string): string {
  return locale === 'he' ? `/he/${slug}/` : `/${slug}/`;
}

export function homePath(locale: Locale): string {
  return locale === 'he' ? '/he/' : '/';
}

const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split('-').map(Number);
  return locale === 'he' ? `${d}.${m}.${y}` : `${d} ${MONTHS_EN[m - 1].slice(0, 3)} ${y}`;
}

const today = () => new Date().toISOString().slice(0, 10);

export const pastShows = shows.filter((s) => s.status === 'past').sort((a, b) => b.dateISO.localeCompare(a.dateISO));
export const upcomingShows = shows.filter((s) => s.status === 'upcoming' && s.dateISO >= today());

export function stats(locale: Locale) {
  const earliest = pastShows.map((s) => s.dateISO).sort()[0];
  const [y, m] = earliest.split('-').map(Number);
  const since = locale === 'he' ? `${MONTHS_HE[m - 1]} ${y}` : `${MONTHS_EN[m - 1]} ${y}`;

  const next = upcomingShows.sort((a, b) => a.dateISO.localeCompare(b.dateISO))[0];
  const nextShow = next
    ? `${formatDate(next.dateISO, locale)}, ${locale === 'he' ? next.venueHe : next.venueEn}, ${locale === 'he' ? next.cityHe : next.cityEn}`
    : locale === 'he'
      ? 'יפורסם בקרוב'
      : 'to be announced';
  const nextShowSentence = next
    ? locale === 'he'
      ? `ההופעה הבאה שלנו: ${nextShow}.`
      : `Our next show: ${nextShow}.`
    : locale === 'he'
      ? 'ההופעה הבאה תפורסם בקרוב.'
      : 'Our next show will be announced soon.';

  return {
    since,
    nextShow,
    nextShowSentence,
  };
}

/** Replaces {{tokens}} in a string with the build-time values. */
export function fill(text: string, locale: Locale): string {
  const values = stats(locale) as Record<string, string>;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown token {{${key}}} in page copy`);
    return values[key];
  });
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Tiny inline markup: **bold** and [text](url). Everything else is escaped. */
export function inline(text: string, locale: Locale): string {
  const html = escapeHtml(fill(text, locale))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
      const external = /^https?:/.test(url);
      return external
        ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : `<a href="${url}">${label}</a>`;
    });
  return html;
}

/** Same as inline() but with the markup stripped, for JSON-LD and meta text. */
export function plain(text: string, locale: Locale): string {
  return fill(text, locale)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1');
}
