import type { PageId } from './types';

const PHONE = '+254 20 765 4321';
const PHONE_HREF = 'tel:+254207654321';
const WHATSAPP_NUMBER = '254712345678';
const WHATSAPP_TEXT = encodeURIComponent('Hello Westside Hotel, I would like to ask about a stay.');

const NAV_ITEMS: Array<{ page: PageId; labelKey: string; href: string }> = [
  { page: 'home', labelKey: 'nav.home', href: 'index.html' },
  { page: 'rooms', labelKey: 'nav.rooms', href: 'rooms.html' },
  { page: 'facilities', labelKey: 'nav.facilities', href: 'facilities.html' },
  { page: 'offers', labelKey: 'nav.offers', href: 'offers.html' },
  { page: 'contact', labelKey: 'nav.contact', href: 'contact.html' },
];

const FACILITY_PAGES: PageId[] = ['facilities', 'dining', 'conference', 'gym'];

function isActive(current: PageId, item: PageId): boolean {
  if (item === 'facilities' && FACILITY_PAGES.includes(current)) {
    return true;
  }
  return current === item;
}

function logo(dark = false): string {
  const wordmark = dark ? 'text-white' : 'text-forest-dark';
  const sub = dark ? 'text-white/55' : 'text-muted';
  return `
    <a href="index.html" class="group flex items-center gap-3" aria-label="Westside Hotel — home">
      <span class="relative flex h-11 w-11 items-center justify-center rounded-full ${dark ? 'bg-white/10 ring-1 ring-white/20' : 'bg-forest'} shadow-soft transition group-hover:scale-[1.03]">
        <span class="font-serif text-2xl leading-none ${dark ? 'text-gold' : 'text-gold'}">K</span>
        <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ${dark ? 'ring-forest-dark' : 'ring-cream'}"></span>
      </span>
      <span class="flex flex-col leading-none">
        <span class="font-serif text-[26px] font-medium tracking-tight ${wordmark}">Westside</span>
        <span class="mt-1 text-[9px] font-bold uppercase tracking-[0.32em] ${sub}">Hotel · Nairobi</span>
      </span>
    </a>
  `;
}

function languageSwitch(): string {
  return `
    <button
      type="button"
      data-language-switch
      data-i18n-aria="header.language"
      aria-label="Language"
      class="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-forest px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm transition hover:bg-forest-light"
    >
      <span data-lang="en" class="text-gold">EN</span>
      <span class="text-white/30">|</span>
      <span data-lang="sw" class="text-white/60">SW</span>
    </button>
  `;
}

function headerHtml(current: PageId): string {
  const nav = NAV_ITEMS.map((item) => {
    const active = isActive(current, item.page);
    return `<a class="nav-link" href="${item.href}" data-i18n="${item.labelKey}"${active ? ' aria-current="page"' : ''}>${item.labelKey}</a>`;
  }).join('');

  return `
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="hidden bg-forest-dark text-white/70 md:block">
      <div class="container-page flex h-9 items-center justify-between text-[11px] font-medium tracking-wide">
        <div class="flex items-center gap-5">
          <span class="inline-flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[14px] text-gold">location_on</span>
            <span data-i18n="header.location">Westlands, Nairobi</span>
          </span>
          <a class="inline-flex items-center gap-1.5 transition hover:text-white" href="${PHONE_HREF}">
            <span class="material-symbols-outlined text-[14px] text-gold">call</span>
            <span data-i18n="header.phoneLabel">${PHONE}</span>
          </a>
        </div>
        <div class="flex items-center gap-5">
          <span class="inline-flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[14px] text-gold">schedule</span>
            <span data-i18n="footer.hoursValue">Front desk open 24 hours</span>
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[14px] text-gold">verified_user</span>
            <span>Best rate direct</span>
          </span>
        </div>
      </div>
    </div>
    <header class="sticky top-0 z-50 border-b border-line/70 bg-cream/92 backdrop-blur-xl">
      <div class="container-page flex h-[76px] items-center justify-between gap-4">
        ${logo()}
        <nav class="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
          ${nav}
        </nav>
        <div class="flex items-center gap-2.5">
          <div class="hidden sm:block">${languageSwitch()}</div>
          <a href="booking.html" class="btn-primary btn-sm !min-h-[44px] !px-5" data-i18n="header.book">Book Direct</a>
          <button
            type="button"
            id="nav-drawer-toggle"
            class="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-forest transition hover:border-forest/30 lg:hidden"
            data-i18n-aria="header.openMenu"
            aria-label="Open navigation menu"
            aria-expanded="false"
            aria-controls="nav-drawer"
          >
            <span class="material-symbols-outlined text-[24px]">menu</span>
          </button>
        </div>
      </div>
    </header>

    <div id="nav-drawer-backdrop" class="fixed inset-0 z-[60] bg-forest-dark/50 opacity-0 pointer-events-none backdrop-blur-sm transition-opacity duration-300"></div>
    <aside
      id="nav-drawer"
      class="fixed right-0 top-0 z-[70] flex h-full w-[330px] max-w-[88vw] translate-x-full flex-col bg-cream shadow-lift transition-transform duration-300 ease-out"
      aria-hidden="true"
      aria-label="Mobile navigation"
    >
      <div class="flex items-center justify-between border-b border-line px-5 py-4">
        ${logo()}
        <button
          type="button"
          id="nav-drawer-close"
          class="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-forest transition hover:border-forest/30"
          data-i18n-aria="header.closeMenu"
          aria-label="Close navigation menu"
        >
          <span class="material-symbols-outlined text-[22px]">close</span>
        </button>
      </div>
      <nav class="flex-1 overflow-y-auto px-3 py-5" aria-label="Mobile navigation">
        <div class="flex flex-col gap-1">
          ${NAV_ITEMS.map((item) => {
            const active = isActive(current, item.page);
            return `<a href="${item.href}" class="flex min-h-[52px] items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold ${active ? 'bg-forest text-white' : 'text-ink hover:bg-sand'}"${active ? ' aria-current="page"' : ''}>
              <span class="material-symbols-outlined text-[20px] ${active ? 'text-gold' : 'text-forest'}">${item.page === 'home' ? 'villa' : item.page === 'rooms' ? 'bed' : item.page === 'facilities' ? 'spa' : item.page === 'offers' ? 'local_offer' : 'support_agent'}</span>
              <span data-i18n="${item.labelKey}">${item.labelKey}</span>
            </a>`;
          }).join('')}
        </div>
        <div class="mt-6 rounded-2xl bg-white p-4 ring-1 ring-line">
          <p class="eyebrow" data-i18n="nav.facilities">Facilities</p>
          <div class="mt-3 flex flex-col gap-2.5">
            <a href="dining.html" class="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-ink transition hover:text-forest">
              <span class="material-symbols-outlined text-[18px] text-gold-deep">restaurant</span>
              <span data-i18n="nav.dining">Restaurant & café</span>
            </a>
            <a href="conference.html" class="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-ink transition hover:text-forest">
              <span class="material-symbols-outlined text-[18px] text-gold-deep">co_present</span>
              <span data-i18n="nav.conference">Conference hall</span>
            </a>
            <a href="gym.html" class="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-ink transition hover:text-forest">
              <span class="material-symbols-outlined text-[18px] text-gold-deep">fitness_center</span>
              <span data-i18n="nav.gym">Gym</span>
            </a>
          </div>
        </div>
      </nav>
      <div class="border-t border-line p-4">
        <div class="mb-3 flex items-center justify-between gap-2">
          ${languageSwitch()}
          <a href="contact.html" class="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-forest">
            <span class="material-symbols-outlined text-[16px]">call</span>
            ${PHONE}
          </a>
        </div>
        <a href="booking.html" class="btn-gold w-full" data-i18n="common.bookDirect">Book Direct</a>
        <p class="mt-3 text-center text-[11px] text-muted" data-i18n="footer.hoursValue">Front desk open 24 hours</p>
      </div>
    </aside>
  `;
}

function footerHtml(): string {
  return `
    <footer class="bg-forest-dark text-white/70">
      <div class="container-page grid gap-12 py-16 lg:grid-cols-[1.5fr_1fr_1fr_1.35fr] lg:py-20">
        <div>
          ${logo(true)}
          <p class="mt-6 max-w-xs text-sm leading-relaxed" data-i18n="footer.about">
            A warm, independent hotel in Westlands, Nairobi — built for people who travel with purpose.
          </p>
          <div class="mt-6">
            <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40" data-i18n="footer.social">Follow Westside</p>
            <div class="mt-3 flex items-center gap-2">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white/80 ring-1 ring-white/10 transition hover:bg-gold hover:text-forest-dark">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z"/></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white/80 ring-1 ring-white/10 transition hover:bg-gold hover:text-forest-dark">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X" class="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white/80 ring-1 ring-white/10 transition hover:bg-gold hover:text-forest-dark">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.4L6.48 22H3.36l7.24-8.28L1.04 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.8h1.73L7.3 4.09H5.45L17.8 19.8Z"/></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" class="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white/80 ring-1 ring-white/10 transition hover:bg-gold hover:text-forest-dark">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5A2.49 2.49 0 1 1 0 3.5a2.49 2.49 0 0 1 4.98 0ZM.24 8.25h4.5V24H.24V8.25Zm7.52 0h4.31v2.15h.06c.6-1.14 2.07-2.34 4.26-2.34 4.56 0 5.4 3 5.4 6.9V24h-4.5v-7.98c0-1.9-.03-4.35-2.65-4.35-2.66 0-3.07 2.07-3.07 4.21V24H7.76V8.25Z"/></svg>
              </a>
              <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" class="flex h-11 w-11 items-center justify-center rounded-full bg-[#1FA855] text-white transition hover:bg-[#178a45]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Zm-5.42 7.1h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.45-4.44 9.88-9.9 9.88Zm8.42-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.31-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41Z"/></svg>
              </a>
            </div>
          </div>
        </div>

        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40" data-i18n="footer.explore">Explore</p>
          <ul class="mt-4 space-y-1">
            <li><a class="flex min-h-[40px] items-center text-sm transition hover:text-gold" href="rooms.html" data-i18n="nav.rooms">Rooms</a></li>
            <li><a class="flex min-h-[40px] items-center text-sm transition hover:text-gold" href="booking.html" data-i18n="common.bookDirect">Book Direct</a></li>
            <li><a class="flex min-h-[40px] items-center text-sm transition hover:text-gold" href="offers.html" data-i18n="nav.offers">Offers & Journal</a></li>
            <li><a class="flex min-h-[40px] items-center text-sm transition hover:text-gold" href="contact.html" data-i18n="nav.contact">Contact</a></li>
            <li><a class="flex min-h-[40px] items-center text-sm transition hover:text-gold" href="dashboard.html" data-i18n="nav.dashboard">Front desk dashboard</a></li>
          </ul>
        </div>

        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40" data-i18n="footer.facilities">Facilities</p>
          <ul class="mt-4 space-y-1">
            <li><a class="flex min-h-[40px] items-center text-sm transition hover:text-gold" href="dining.html" data-i18n="nav.dining">Restaurant & café</a></li>
            <li><a class="flex min-h-[40px] items-center text-sm transition hover:text-gold" href="conference.html" data-i18n="nav.conference">Conference hall</a></li>
            <li><a class="flex min-h-[40px] items-center text-sm transition hover:text-gold" href="gym.html" data-i18n="nav.gym">Gym</a></li>
            <li><a class="flex min-h-[40px] items-center text-sm transition hover:text-gold" href="facilities.html" data-i18n="nav.facilities">Facilities</a></li>
          </ul>
        </div>

        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40" data-i18n="footer.contact">Contact</p>
          <ul class="mt-4 space-y-3 text-sm">
            <li class="flex gap-2.5">
              <span class="material-symbols-outlined text-[18px] text-gold">location_on</span>
              <span data-i18n="footer.address">12 Jacaranda Lane, Westlands, Nairobi</span>
            </li>
            <li class="flex gap-2.5">
              <span class="material-symbols-outlined text-[18px] text-gold">call</span>
              <a class="transition hover:text-gold" href="${PHONE_HREF}">+254 20 765 4321</a>
            </li>
            <li class="flex gap-2.5">
              <span class="material-symbols-outlined text-[18px] text-gold">mail</span>
              <a class="transition hover:text-gold" href="mailto:stay@westsidehotel.co.ke">stay@westsidehotel.co.ke</a>
            </li>
            <li class="flex gap-2.5">
              <span class="material-symbols-outlined text-[18px] text-gold">schedule</span>
              <span data-i18n="footer.hoursValue">Front desk open 24 hours</span>
            </li>
          </ul>
          <a href="https://maps.google.com/?q=Westlands,Nairobi,Kenya" target="_blank" rel="noopener noreferrer" class="link-arrow mt-3 text-gold hover:text-gold-soft" data-i18n="footer.map">View on map</a>
        </div>
      </div>

      <div class="border-t border-white/10">
        <div class="container-page flex flex-col gap-3 py-5 text-[11px] sm:flex-row sm:items-center sm:justify-between">
          <p>© <span data-current-year>2026</span> Westside Hotel. <span data-i18n="footer.rights">All rights reserved.</span></p>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-1">
            <a class="transition hover:text-gold" href="contact.html" data-i18n="footer.privacy">Privacy</a>
            <a class="transition hover:text-gold" href="contact.html" data-i18n="footer.terms">Terms</a>
            <a class="transition hover:text-gold" href="dashboard.html" data-i18n="footer.staff">Staff login</a>
            <span class="inline-flex items-center gap-1.5 text-white/50">
              <span class="material-symbols-outlined text-[14px] text-gold">verified_user</span>
              Secure booking
            </span>
          </div>
        </div>
      </div>
    </footer>

    <a
      href="https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_TEXT}"
      target="_blank"
      rel="noopener noreferrer"
      data-whatsapp-float
      data-i18n-aria="whatsapp.label"
      aria-label="Chat with Westside on WhatsApp"
      class="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1FA855] text-white shadow-lift transition hover:scale-105 hover:bg-[#178a45] focus-visible:ring-offset-2"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Zm-5.42 7.1h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.45-4.44 9.88-9.9 9.88Zm8.42-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.31-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41Z"/></svg>
    </a>
    <div id="toast-region" class="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite" aria-atomic="true"></div>
  `;
}

export function initLayout(): void {
  const page = (document.body.dataset.page ?? 'home') as PageId;
  const chrome = document.body.dataset.chrome ?? 'marketing';
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');

  if (header) {
    header.innerHTML = chrome === 'app' ? '' : headerHtml(page);
  }

  if (footer) {
    footer.innerHTML = chrome === 'app' ? '' : footerHtml();
  }

  const year = document.querySelector('[data-current-year]');
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  if (page === 'booking' || page === 'dashboard') {
    document.querySelector('[data-whatsapp-float]')?.remove();
  }

  const heading = document.querySelector<HTMLElement>('main h1');
  if (heading && !heading.id) {
    heading.id = 'main-heading';
  }
}

export { PHONE, PHONE_HREF, WHATSAPP_NUMBER };
