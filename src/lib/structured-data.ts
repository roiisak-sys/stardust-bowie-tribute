// Builds the schema.org JSON-LD graph for a page. Helps Google and AI assistants
// understand who the band is and connect the names (STARDUST, סטארדאסט, the
// former YADAYADAS) to one entity. The home page carries the full band record,
// its members, upcoming shows and the showreel; content pages carry the band
// reference plus page-specific nodes (breadcrumbs, FAQ, service).
import members from '../content/band-members.json';
import shows from '../content/shows.json';
import copyEn from '../content/copy.en.json';
import copyHe from '../content/copy.he.json';
import { fill, plain, pagePath, homePath, upcomingShows, type Locale } from './pages';

const YOUTUBE_ID = 'fPsdsE5sYtk';

const abs = (site: URL, path: string) => new URL(path, site).toString();
const bandId = (site: URL) => abs(site, '/#band');
const siteId = (site: URL) => abs(site, '/#website');

function websiteNode(site: URL) {
  return {
    '@type': 'WebSite',
    '@id': siteId(site),
    url: abs(site, '/'),
    name: 'STARDUST - David Bowie Tribute',
    inLanguage: ['en', 'he'],
    publisher: { '@id': bandId(site) },
  };
}

function bandNode(locale: Locale, site: URL, description: string) {
  const copy = locale === 'he' ? copyHe : copyEn;
  return {
    '@type': 'MusicGroup',
    '@id': bandId(site),
    name: locale === 'he' ? 'סטארדאסט - מופע מחווה לדיוויד בואי' : 'STARDUST - David Bowie Tribute',
    alternateName: ['STARDUST', 'סטארדאסט', 'סטארדסט', 'YADAYADAS'],
    description,
    url: abs(site, homePath(locale)),
    logo: abs(site, '/assets/logo/stardust-logo.webp'),
    image: abs(site, '/assets/og/stardust-og.jpg'),
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
        image: abs(site, m.photo),
      })),
  };
}

/** Ticket offer. Price, currency and sale start come from shows.json (the
 *  ticket seller's published full price); without a ticket link there is no offer. */
function offerFor(show: (typeof shows)[number]) {
  const s = show as typeof show & { ticketPrice?: number; ticketCurrency?: string; ticketsOnSaleFrom?: string };
  if (!s.ticketUrl) return undefined;
  return {
    '@type': 'Offer',
    url: s.ticketUrl,
    availability: 'https://schema.org/InStock',
    price: s.ticketPrice,
    priceCurrency: s.ticketPrice !== undefined ? s.ticketCurrency : undefined,
    validFrom: s.ticketsOnSaleFrom,
  };
}

function eventNodes(locale: Locale, site: URL) {
  return upcomingShows.map((s) => ({
    '@type': 'MusicEvent',
    name: locale === 'he' ? `סטארדאסט, מחווה לדיוויד בואי: ${s.venueHe}` : `STARDUST, David Bowie Tribute: ${s.venueEn}`,
    description:
      locale === 'he'
        ? `מופע מחווה לדיוויד בואי עם להקת סטארדאסט: שישה מוזיקאים, רוקנרול חי וסיפורו של בואי בין השירים. ${s.venueHe}, ${s.cityHe}.`
        : `A David Bowie tribute show by the band STARDUST: six musicians, live rock and roll, and Bowie's story between the songs. ${s.venueEn}, ${s.cityEn}.`,
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
    image: s.posterImage ? [abs(site, s.posterImage)] : undefined,
    url: s.eventUrl || undefined,
    performer: { '@id': bandId(site) },
    organizer: { '@id': bandId(site) },
    offers: offerFor(s),
  }));
}

function videoNode(locale: Locale, description: string) {
  return {
    '@type': 'VideoObject',
    name: locale === 'he' ? 'סטארדאסט, מופע מחווה לדיוויד בואי' : 'STARDUST, David Bowie Tribute Show',
    description,
    thumbnailUrl: `https://i.ytimg.com/vi/${YOUTUBE_ID}/hqdefault.jpg`,
    uploadDate: '2026-08-15T00:00:00+03:00',
    duration: 'PT1M4S',
    embedUrl: `https://www.youtube.com/embed/${YOUTUBE_ID}`,
    inLanguage: locale,
  };
}

/** Home pages: website, full band record, upcoming shows, showreel. */
export function buildStructuredData(opts: { locale: Locale; site: URL; description: string }) {
  const { locale, site, description } = opts;
  return {
    '@context': 'https://schema.org',
    '@graph': [websiteNode(site), bandNode(locale, site, description), ...eventNodes(locale, site), videoNode(locale, description)],
  };
}

const SERVICE_PAGES = new Set(['events', 'corporate-events']);

/** Content pages: breadcrumbs, the page itself, FAQ, service, plus the band reference. */
export function buildPageStructuredData(opts: { locale: Locale; site: URL; slug: string; page: any }) {
  const { locale, site, slug, page } = opts;
  const url = abs(site, pagePath(locale, slug));
  const description = plain(page.description, locale);

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: locale === 'he' ? 'סטארדאסט' : 'STARDUST', item: abs(site, homePath(locale)) },
      { '@type': 'ListItem', position: 2, name: page.navLabel, item: url },
    ],
  };

  const webPage: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: plain(page.title, locale),
    description,
    inLanguage: locale,
    isPartOf: { '@id': siteId(site) },
    about: { '@id': bandId(site) },
    breadcrumb: { '@id': `${url}#breadcrumb` },
  };
  if (slug === 'david-bowie') {
    webPage.about = {
      '@type': 'Person',
      name: 'David Bowie',
      alternateName: ['דיוויד בואי', 'דייויד בואי'],
      birthDate: '1947-01-08',
      deathDate: '2016-01-10',
      sameAs: ['https://en.wikipedia.org/wiki/David_Bowie', 'https://www.davidbowie.com'],
    };
  }
  if (slug === 'ziggy-stardust') {
    webPage.about = {
      '@type': 'MusicAlbum',
      name: 'The Rise and Fall of Ziggy Stardust and the Spiders from Mars',
      byArtist: { '@type': 'Person', name: 'David Bowie' },
      datePublished: '1972-06-16',
    };
  }

  const nodes: unknown[] = [websiteNode(site), bandNode(locale, site, description), { ...breadcrumb, '@id': `${url}#breadcrumb` }, webPage];

  if (Array.isArray(page.faq) && page.faq.length > 0) {
    nodes.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      inLanguage: locale,
      mainEntity: page.faq.map((f: { q: string; a: string }) => ({
        '@type': 'Question',
        name: plain(f.q, locale),
        acceptedAnswer: { '@type': 'Answer', text: plain(f.a, locale) },
      })),
    });
  }

  if (SERVICE_PAGES.has(slug)) {
    nodes.push({
      '@type': 'Service',
      '@id': `${url}#service`,
      name: plain(page.h1, locale),
      serviceType: locale === 'he' ? 'הופעה חיה של להקה לאירועים' : 'Live band performance for events',
      description,
      provider: { '@id': bandId(site) },
      areaServed: { '@type': 'Country', name: 'Israel' },
      url,
    });
  }

  if (slug === 'shows' || slug === 'show') nodes.push(...eventNodes(locale, site));

  return { '@context': 'https://schema.org', '@graph': nodes };
}
