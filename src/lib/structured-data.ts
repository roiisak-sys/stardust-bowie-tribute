// Builds the schema.org JSON-LD graph for a page: the band (MusicGroup, with its
// members), the website, the upcoming shows (MusicEvent) and the showreel video.
// Helps Google and AI assistants understand who the band is and connect the
// names (STARDUST, סטארדאסט, the former YADAYADAS) to one entity.
import members from '../content/band-members.json';
import shows from '../content/shows.json';
import copyEn from '../content/copy.en.json';
import copyHe from '../content/copy.he.json';

type Locale = 'he' | 'en';

const YOUTUBE_ID = 'fPsdsE5sYtk';

export function buildStructuredData(opts: { locale: Locale; site: URL; description: string }) {
  const { locale, site, description } = opts;
  const abs = (path: string) => new URL(path, site).toString();
  const copy = locale === 'he' ? copyHe : copyEn;
  const homeUrl = locale === 'he' ? abs('/he/') : abs('/');
  const bandId = abs('/#band');
  const siteId = abs('/#website');

  const name = locale === 'he' ? 'סטארדאסט - מופע מחווה לדיוויד בואי' : 'STARDUST - David Bowie Tribute';

  const band = {
    '@type': 'MusicGroup',
    '@id': bandId,
    name,
    alternateName: ['STARDUST', 'סטארדאסט', 'סטארדסט', 'YADAYADAS'],
    description,
    url: homeUrl,
    logo: abs('/assets/logo/stardust-logo.webp'),
    image: abs('/assets/og/stardust-og.jpg'),
    genre: ['Rock', 'Tribute'],
    inLanguage: locale,
    areaServed: { '@type': 'Country', name: 'Israel' },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'booking',
      telephone: '+972509841722',
      availableLanguage: ['he', 'en'],
    },
    sameAs: [copy.contact.instagramUrl, copy.contact.facebookUrl],
    member: members
      .filter((m) => m.role === 'core')
      .map((m) => ({
        '@type': 'Person',
        name: locale === 'he' ? m.nameHe : m.nameEn,
        jobTitle: locale === 'he' ? m.instrumentHe : m.instrumentEn,
        image: abs(m.photo),
      })),
  };

  const website = {
    '@type': 'WebSite',
    '@id': siteId,
    url: abs('/'),
    name: 'STARDUST - David Bowie Tribute',
    inLanguage: ['en', 'he'],
    publisher: { '@id': bandId },
  };

  // Only shows that have not happened yet (evaluated when the site is built).
  const today = new Date().toISOString().slice(0, 10);
  const events = shows
    .filter((s) => s.status === 'upcoming' && s.dateISO >= today)
    .map((s) => ({
      '@type': 'MusicEvent',
      name: locale === 'he' ? `סטארדאסט, מחווה לדיוויד בואי: ${s.venueHe}` : `STARDUST, David Bowie Tribute: ${s.venueEn}`,
      startDate: s.dateISO,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: locale === 'he' ? s.venueHe : s.venueEn,
        address: {
          '@type': 'PostalAddress',
          addressLocality: locale === 'he' ? s.cityHe : s.cityEn,
          addressCountry: 'IL',
        },
      },
      image: s.posterImage ? [abs(s.posterImage)] : undefined,
      url: s.eventUrl || undefined,
      performer: { '@id': bandId },
    }));

  const video = {
    '@type': 'VideoObject',
    name: locale === 'he' ? 'סטארדאסט, מופע מחווה לדיוויד בואי' : 'STARDUST, David Bowie Tribute Show',
    description,
    thumbnailUrl: `https://i.ytimg.com/vi/${YOUTUBE_ID}/hqdefault.jpg`,
    uploadDate: '2026-08-15',
    duration: 'PT1M4S',
    embedUrl: `https://www.youtube.com/embed/${YOUTUBE_ID}`,
    inLanguage: locale,
  };

  return { '@context': 'https://schema.org', '@graph': [website, band, ...events, video] };
}
