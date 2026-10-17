import { describe, it, expect } from 'vitest';
import bandMembers from './content/band-members.json';
import shows from './content/shows.json';
import copyHe from './content/copy.he.json';
import copyEn from './content/copy.en.json';

describe('band-members.json', () => {
  it('has exactly 6 core members', () => {
    expect(bandMembers.filter((m: any) => m.role === 'core')).toHaveLength(6);
  });

  it('every member has required bilingual fields', () => {
    for (const m of bandMembers as any[]) {
      expect(m.id).toBeTruthy();
      expect(m.nameHe).toBeTruthy();
      expect(m.nameEn).toBeTruthy();
      expect(m.instrumentHe).toBeTruthy();
      expect(m.instrumentEn).toBeTruthy();
      expect(m.photo).toMatch(/^\/assets\/band\/.+\.webp$/);
    }
  });

  it('has unique ids', () => {
    const ids = (bandMembers as any[]).map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every member has a non-empty bilingual bio (age is optional but valid when present)', () => {
    for (const m of bandMembers as any[]) {
      if (m.age !== undefined) {
        expect(typeof m.age).toBe('number');
        expect(m.age).toBeGreaterThan(0);
      }
      expect(m.bioHe.length).toBeGreaterThan(0);
      expect(m.bioEn.length).toBeGreaterThan(0);
    }
  });
});

describe('shows.json', () => {
  it('every show has required fields, a valid ISO date, and a unique id', () => {
    const ids = new Set<string>();
    for (const s of shows as any[]) {
      expect(s.id).toBeTruthy();
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
      expect(() => new Date(s.dateISO).toISOString()).not.toThrow();
      expect(s.venueHe).toBeTruthy();
      expect(s.venueEn).toBeTruthy();
      expect(s.cityHe).toBeTruthy();
      expect(s.cityEn).toBeTruthy();
      expect(['past', 'upcoming']).toContain(s.status);
      // posterImage/ticketUrl may legitimately be empty strings (no real
      // poster files could be extracted from Facebook, no ticketed shows
      // found) — only type-check them, don't require truthy.
      expect(typeof s.posterImage).toBe('string');
      expect(typeof s.eventUrl).toBe('string');
      expect(typeof s.ticketUrl).toBe('string');
    }
  });

  it('is sorted newest-first by dateISO', () => {
    const dates = (shows as any[]).map((s) => s.dateISO);
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });
});

describe('copy.he.json / copy.en.json', () => {
  it('both locales define the same set of keys', () => {
    const flatten = (obj: any, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === 'object' && v !== null
          ? flatten(v, `${prefix}${k}.`)
          : [`${prefix}${k}`]
      );
    const heKeys = flatten(copyHe).sort();
    const enKeys = flatten(copyEn).sort();
    expect(heKeys).toEqual(enKeys);
  });

  it('both locales define 8 Bowie eras with name, line, and image', () => {
    expect(copyHe.bowies.eras).toHaveLength(8);
    expect(copyEn.bowies.eras).toHaveLength(8);
    for (const era of [...copyHe.bowies.eras, ...copyEn.bowies.eras] as any[]) {
      expect(era.name).toBeTruthy();
      expect(era.line).toBeTruthy();
      expect(era.image).toMatch(/^\/assets\/bowie\/.+\.webp$/);
    }
  });
});
