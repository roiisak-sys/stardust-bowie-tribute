import { describe, it, expect } from 'vitest';
import { nextShow, nextShowPill, pastYears, showYear, type ShowRow } from './shows-ui';

const mk = (over: Partial<ShowRow>): ShowRow => ({
  id: 'x',
  status: 'upcoming',
  dateISO: '2026-11-07',
  venueHe: 'מקום',
  venueEn: 'Venue',
  cityHe: 'הוד השרון',
  cityEn: 'Hod HaSharon',
  ticketUrl: '',
  eventUrl: '',
  ...over,
});

const TODAY = '2026-11-03';

describe('nextShow', () => {
  it('returns null for an empty list', () => {
    expect(nextShow([], TODAY)).toBeNull();
  });

  it('returns the upcoming show, not the past one', () => {
    const past = mk({ id: 'past', status: 'past', dateISO: '2026-08-08' });
    const up = mk({ id: 'up', dateISO: '2026-11-07' });
    expect(nextShow([past, up], TODAY)?.id).toBe('up');
  });

  it('ignores an upcoming show dated before today', () => {
    const stale = mk({ id: 'stale', dateISO: '2026-10-01' });
    expect(nextShow([stale], TODAY)).toBeNull();
  });

  it('returns the earlier of two upcoming shows', () => {
    const later = mk({ id: 'later', dateISO: '2026-12-01' });
    const sooner = mk({ id: 'sooner', dateISO: '2026-11-07' });
    expect(nextShow([later, sooner], TODAY)?.id).toBe('sooner');
  });

  it('includes a show happening today', () => {
    const t = mk({ id: 'today', dateISO: TODAY });
    expect(nextShow([t], TODAY)?.id).toBe('today');
  });
});

describe('nextShowPill', () => {
  const show = mk({ ticketUrl: 'https://t.example/tickets', eventUrl: 'https://e.example/event' });

  it('formats Hebrew text with the Hebrew city', () => {
    expect(nextShowPill([show], 'he', 'ההופעה הבאה', TODAY)).toEqual({
      label: 'ההופעה הבאה',
      text: '7.11 · הוד השרון',
      href: 'https://t.example/tickets',
    });
  });

  it('formats English text with the English city', () => {
    expect(nextShowPill([show], 'en', 'Next show', TODAY)?.text).toBe('7.11 · Hod HaSharon');
  });

  it('falls back to eventUrl, then to the upcoming-shows anchor', () => {
    const noTicket = mk({ ticketUrl: '', eventUrl: 'https://e.example/event' });
    expect(nextShowPill([noTicket], 'en', 'Next show', TODAY)?.href).toBe('https://e.example/event');
    const neither = mk({ ticketUrl: '', eventUrl: '' });
    expect(nextShowPill([neither], 'en', 'Next show', TODAY)?.href).toBe('#upcoming-shows');
  });

  it('returns null when there is no next show', () => {
    expect(nextShowPill([], 'en', 'Next show', TODAY)).toBeNull();
  });
});

describe('pastYears / showYear', () => {
  it('returns distinct past years, newest first', () => {
    const shows = [
      mk({ status: 'past', dateISO: '2025-03-01' }),
      mk({ status: 'past', dateISO: '2026-08-08' }),
      mk({ status: 'past', dateISO: '2025-09-09' }),
      mk({ status: 'past', dateISO: '2024-01-15' }),
      mk({ status: 'upcoming', dateISO: '2027-01-01' }),
    ];
    expect(pastYears(shows)).toEqual(['2026', '2025', '2024']);
  });

  it('showYear returns the year as a string', () => {
    expect(showYear(mk({ dateISO: '2026-11-07' }))).toBe('2026');
  });
});
