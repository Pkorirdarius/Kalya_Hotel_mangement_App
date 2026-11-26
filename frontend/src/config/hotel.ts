/**
 * The single source of truth for every brand-dependent value on the site.
 *
 * The client may rename the hotel later. Renaming must only require editing
 * this file (plus the `brand.*` / template strings in `src/i18n.ts`), the
 * backend `HOTEL_*` environment defaults and the seeded `HotelSetting`
 * record. No component, page or test may hard-code a brand string.
 *
 * IMPORTANT — placeholders that still need hotel confirmation:
 * The source material for this project contains contradictory location
 * information (a Westlands, Nairobi address and a Westlands, Kapenguria
 * address). A town has deliberately NOT been chosen here. The values below
 * are the placeholders already rendered by the current site; they are
 * flagged in `needsConfirmation` and must be confirmed or corrected by the
 * hotel before launch (see docs/LAUNCH-CHECKLIST.md).
 */

export interface SocialLink {
  id: 'facebook' | 'instagram' | 'x' | 'linkedin' | 'whatsapp';
  href: string;
}

/**
 * Conference halls guests can select. The ids are also the backend choice
 * values, so keep this list in sync with `ConferenceEnquiry.Hall`.
 */
export const CONFERENCE_HALLS = [
  { id: 'kopoch', name: 'Kopoch Hall' },
  { id: 'attelo', name: 'The Attelo Hall' },
  { id: 'boardroom', name: 'Executive Board Room' },
] as const;

export type ConferenceHallId = (typeof CONFERENCE_HALLS)[number]['id'];

export const CONFERENCE_HALL_IDS = CONFERENCE_HALLS.map(
  (hall) => hall.id,
) as [ConferenceHallId, ...ConferenceHallId[]];

export interface BrandConfig {
  /** Full hotel name, e.g. used in the footer copyright and JSON-LD. */
  name: string;
  /** Wordmark shown in the logo (no "Hotel" suffix). */
  shortName: string;
  /** Single letter shown inside the round logo mark. */
  monogram: string;
  /** Registered name used for bank transfer payee labels. */
  legalName: string;
  /** Canonical domain, no scheme. Used for UIDs, sitemap and email senders. */
  domain: string;
  websiteUrl: string;
  logo: {
    /** Small line under the wordmark, e.g. "Hotel — Town". */
    subline: string;
  };
  location: {
    addressLine: string;
    town: string;
    county: string;
    country: string;
    /** Google Maps query string. */
    mapQuery: string;
  };
  contact: {
    /** Human-readable phone number. */
    phoneDisplay: string;
    phoneHref: string;
    whatsappNumber: string;
    email: string;
  };
  /** Facility sub-brand names (also served by the backend CMS). */
  facilities: {
    restaurantName: string;
    cafeName: string;
    /** Primary hall used in image alt text and search metadata. */
    hallName: string;
    /** All conference halls guests can book. */
    hallNames: string[];
    gymName: string;
  };
  socials: SocialLink[];
  /**
   * Placeholder flags. Anything listed here is shown to guests as-is for
   * layout purposes but must be confirmed by the hotel before launch.
   * Staff-facing surfaces surface these flags as "needs hotel confirmation".
   */
  needsConfirmation: {
    /** Address / town / map link — sources disagree (see header comment). */
    location: true;
    /** Phone numbers and email addresses. */
    contact: true;
    /** Social profile URLs are generic placeholders. */
    social: true;
  };
}

export const HOTEL: BrandConfig = {
  name: 'West Premier Hotel',
  shortName: 'West Premier',
  monogram: 'W',
  legalName: 'West Premier Hotel Ltd',
  domain: 'westpremierhotel.co.ke',
  websiteUrl: 'https://westpremierhotel.co.ke',
  logo: {
    subline: 'Hotel — Kapenguria',
  },
  location: {
    addressLine: '12 Jacaranda Lane',
    town: 'Kapenguria',
    county: 'West Pokot',
    country: 'Kenya',
    // Placeholder pending hotel confirmation: the repo's source material
    // contains both a Nairobi (Westlands) and a Kapenguria (West Pokot)
    // location. Do not treat either as final.
    mapQuery: 'Westlands,Kapenguria,Kenya',
  },
  contact: {
    phoneDisplay: '+254 20 765 4321',
    phoneHref: 'tel:+254207654321',
    whatsappNumber: '254712345678',
    email: 'stay@westpremierhotel.co.ke',
  },
  facilities: {
    restaurantName: 'Tamarind Restaurant',
    cafeName: 'C&K',
    hallName: CONFERENCE_HALLS[0].name,
    hallNames: CONFERENCE_HALLS.map((hall) => hall.name),
    gymName: 'Westside Fitness',
  },
  socials: [
    { id: 'facebook', href: 'https://facebook.com' },
    { id: 'instagram', href: 'https://instagram.com' },
    { id: 'x', href: 'https://x.com' },
    { id: 'linkedin', href: 'https://linkedin.com' },
  ],
  needsConfirmation: {
    location: true,
    contact: true,
    social: true,
  },
};

/** One-line postal address, e.g. "12 Jacaranda Lane, Kapenguria". */
export function addressText(hotel: BrandConfig = HOTEL): string {
  return `${hotel.location.addressLine}, ${hotel.location.town}, ${hotel.location.county}`;
}

export function mapLink(hotel: BrandConfig = HOTEL): string {
  return `https://maps.google.com/?q=${encodeURIComponent(hotel.location.mapQuery)}`;
}

export function whatsappHref(hotel: BrandConfig = HOTEL): string {
  return `https://wa.me/${hotel.contact.whatsappNumber}`;
}

/** WhatsApp number formatted for display, e.g. "+254 712 345 678". */
export function whatsappDisplay(hotel: BrandConfig = HOTEL): string {
  const raw = hotel.contact.whatsappNumber;
  if (/^254\d{9}$/.test(raw)) {
    return `+${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6, 9)} ${raw.slice(9)}`;
  }
  return raw;
}

/** Join a list for prose, e.g. "A, B and C". */
function listWithAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Values available to every i18n template as {name}, {town}, … */
export function brandTemplateVars(hotel: BrandConfig = HOTEL): Record<string, string> {
  return {
    name: hotel.name,
    shortName: hotel.shortName,
    legalName: hotel.legalName,
    monogram: hotel.monogram,
    domain: hotel.domain,
    websiteUrl: hotel.websiteUrl,
    address: addressText(hotel),
    town: hotel.location.town,
    county: hotel.location.county,
    country: hotel.location.country,
    phone: hotel.contact.phoneDisplay,
    phoneHref: hotel.contact.phoneHref,
    whatsapp: hotel.contact.whatsappNumber,
    whatsappDisplay: whatsappDisplay(hotel),
    email: hotel.contact.email,
    restaurantName: hotel.facilities.restaurantName,
    cafeName: hotel.facilities.cafeName,
    hallName: hotel.facilities.hallName,
    hallNames: hotel.facilities.hallNames.join(', '),
    hallList: listWithAnd(hotel.facilities.hallNames),
    gymName: hotel.facilities.gymName,
  };
}
