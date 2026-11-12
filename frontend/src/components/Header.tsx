import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HOTEL } from '../config/hotel';
import { useI18n } from '../i18n-context';
import type { PageId } from '../types';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';

const NAV_ITEMS: Array<{ page: PageId; labelKey: string; to: string }> = [
  { page: 'home', labelKey: 'nav.home', to: '/' },
  { page: 'rooms', labelKey: 'nav.rooms', to: '/rooms' },
  { page: 'facilities', labelKey: 'nav.facilities', to: '/facilities' },
  { page: 'offers', labelKey: 'nav.offers', to: '/offers' },
  { page: 'contact', labelKey: 'nav.contact', to: '/contact' },
];

const FACILITY_PAGES: PageId[] = ['facilities', 'dining', 'conference', 'gym'];

const PAGE_ICONS: Partial<Record<PageId, string>> = {
  home: 'villa',
  rooms: 'bed',
  facilities: 'spa',
  offers: 'local_offer',
  contact: 'support_agent',
};

const FACILITY_LINKS = [
  { to: '/dining', icon: 'restaurant', labelKey: 'nav.dining' },
  { to: '/conference', icon: 'co_present', labelKey: 'nav.conference' },
  { to: '/gym', icon: 'fitness_center', labelKey: 'nav.gym' },
];

function pageFromPath(pathname: string): PageId {
  if (pathname.startsWith('/rooms')) return 'rooms';
  if (pathname.startsWith('/booking')) return 'booking';
  if (pathname.startsWith('/dining')) return 'dining';
  if (pathname.startsWith('/conference')) return 'conference';
  if (pathname.startsWith('/gym')) return 'gym';
  if (pathname.startsWith('/facilities')) return 'facilities';
  if (pathname.startsWith('/offers')) return 'offers';
  if (pathname.startsWith('/contact')) return 'contact';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  return 'home';
}

function isActive(current: PageId, item: PageId): boolean {
  if (item === 'facilities' && FACILITY_PAGES.includes(current)) {
    return true;
  }
  return current === item;
}

export function Header() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const current = pageFromPath(pathname);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="hidden bg-forest-dark text-white/70 md:block">
        <div className="container-page flex h-9 items-center justify-between text-[11px] font-medium tracking-wide">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-gold">location_on</span>
              <span>{t('header.location')}</span>
            </span>
            <a className="inline-flex items-center gap-1.5 transition hover:text-white" href={HOTEL.contact.phoneHref}>
              <span className="material-symbols-outlined text-[14px] text-gold">call</span>
              <span>{HOTEL.contact.phoneDisplay}</span>
            </a>
          </div>
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-gold">schedule</span>
              <span>{t('footer.hoursValue')}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-gold">verified_user</span>
              <span>{t('header.bestRate')}</span>
            </span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-line/70 bg-cream/92 backdrop-blur-xl">
        <div className="container-page flex h-[76px] items-center justify-between gap-4">
          <Logo />
          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => {
              const active = isActive(current, item.page);
              return (
                <Link
                  key={item.page}
                  to={item.to}
                  className="nav-link"
                  aria-current={active ? 'page' : undefined}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block">
              <LanguageSwitch />
            </div>
            <Link
              to="/booking"
              className="btn-primary btn-sm !min-h-[44px] !px-5"
            >
              {t('header.book')}
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-forest transition hover:border-forest/30 lg:hidden"
              aria-label={t('header.openMenu')}
              aria-expanded={open}
              aria-controls="nav-drawer"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
          </div>
        </div>
      </header>

      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-forest-dark/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />
      <aside
        id="nav-drawer"
        className={`fixed right-0 top-0 z-[70] flex h-full w-[330px] max-w-[88vw] flex-col bg-cream shadow-lift transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <Logo onClick={() => setOpen(false)} />
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-forest transition hover:border-forest/30"
            aria-label={t('header.closeMenu')}
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Mobile navigation">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(current, item.page);
              return (
                <Link
                  key={item.page}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-[52px] items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold ${
                    active ? 'bg-forest text-white' : 'text-ink hover:bg-sand'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      active ? 'text-gold' : 'text-forest'
                    }`}
                  >
                    {PAGE_ICONS[item.page] ?? 'chevron_right'}
                  </span>
                  <span>{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="eyebrow">{t('nav.facilities')}</p>
            <div className="mt-3 flex flex-col gap-2.5">
              {FACILITY_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-ink transition hover:text-forest"
                >
                  <span className="material-symbols-outlined text-[18px] text-gold-deep">
                    {link.icon}
                  </span>
                  <span>{t(link.labelKey)}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <div className="border-t border-line p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <LanguageSwitch />
            <a
              href={HOTEL.contact.phoneHref}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-forest"
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              {HOTEL.contact.phoneDisplay}
            </a>
          </div>
          <Link to="/booking" onClick={() => setOpen(false)} className="btn-gold w-full">
            {t('common.bookDirect')}
          </Link>
          <p className="mt-3 text-center text-[11px] text-muted">{t('footer.hoursValue')}</p>
        </div>
      </aside>
    </>
  );
}
