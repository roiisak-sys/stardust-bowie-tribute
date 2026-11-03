export type ShowRow = {
  id: string;
  status: 'past' | 'upcoming';
  dateISO: string;
  venueHe: string;
  venueEn: string;
  cityHe: string;
  cityEn: string;
  ticketUrl: string;
  eventUrl: string;
};

/** Earliest upcoming show dated today or later, else null. `today` is 'YYYY-MM-DD'. */
export function nextShow(shows: ShowRow[], today: string): ShowRow | null {
  const candidates = shows
    .filter((s) => s.status === 'upcoming' && s.dateISO >= today)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  return candidates[0] ?? null;
}

export function nextShowPill(
  shows: ShowRow[],
  locale: 'he' | 'en',
  label: string,
  today: string,
): { label: string; text: string; href: string } | null {
  const show = nextShow(shows, today);
  if (!show) return null;
  const [, month, day] = show.dateISO.split('-');
  const city = locale === 'he' ? show.cityHe : show.cityEn;
  return {
    label,
    text: `${Number(day)}.${Number(month)} · ${city}`,
    href: show.ticketUrl || show.eventUrl || '#upcoming-shows',
  };
}

export function showYear(show: ShowRow): string {
  return show.dateISO.slice(0, 4);
}

/** Distinct years of past shows, newest first. */
export function pastYears(shows: ShowRow[]): string[] {
  const years = new Set(shows.filter((s) => s.status === 'past').map(showYear));
  return [...years].sort((a, b) => b.localeCompare(a));
}
