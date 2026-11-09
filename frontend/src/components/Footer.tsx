import { Link } from 'react-router-dom';
import { useI18n } from '../i18n-context';
import {
  ADDRESS,
  EMAIL,
  EMAIL_HREF,
  MAP_LINK,
  PHONE,
  PHONE_HREF,
  WHATSAPP_NUMBER,
  WHATSAPP_TEXT,
} from '../lib/constants';
import { Logo } from './Logo';

const SOCIAL_LINK =
  'flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white/80 ring-1 ring-white/10 transition hover:bg-gold hover:text-forest-dark';

export function Footer() {
  const { t } = useI18n();

  return (
    <>
      <footer className="bg-forest-dark text-white/70">
        <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.5fr_1fr_1fr_1.35fr] lg:py-20">
          <div>
            <Logo dark />
            <p className="mt-6 max-w-xs text-sm leading-relaxed">{t('footer.about')}</p>
            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">
                {t('footer.social')}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className={SOCIAL_LINK}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className={SOCIAL_LINK}
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X"
                  className={SOCIAL_LINK}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.4L6.48 22H3.36l7.24-8.28L1.04 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.8h1.73L7.3 4.09H5.45L17.8 19.8Z" />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className={SOCIAL_LINK}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M4.98 3.5A2.49 2.49 0 1 1 0 3.5a2.49 2.49 0 0 1 4.98 0ZM.24 8.25h4.5V24H.24V8.25Zm7.52 0h4.31v2.15h.06c.6-1.14 2.07-2.34 4.26-2.34 4.56 0 5.4 3 5.4 6.9V24h-4.5v-7.98c0-1.9-.03-4.35-2.65-4.35-2.66 0-3.07 2.07-3.07 4.21V24H7.76V8.25Z" />
                  </svg>
                </a>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1FA855] text-white transition hover:bg-[#178a45]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Zm-5.42 7.1h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.45-4.44 9.88-9.9 9.88Zm8.42-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.31-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">
              {t('footer.explore')}
            </p>
            <ul className="mt-4 space-y-1">
              {[
                { to: '/rooms', label: t('nav.rooms') },
                { to: '/booking', label: t('common.bookDirect') },
                { to: '/offers', label: t('nav.offers') },
                { to: '/contact', label: t('nav.contact') },
                { to: '/dashboard', label: t('nav.dashboard') },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    className="flex min-h-[40px] items-center text-sm transition hover:text-gold"
                    to={link.to}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">
              {t('footer.facilities')}
            </p>
            <ul className="mt-4 space-y-1">
              {[
                { to: '/dining', label: t('nav.dining') },
                { to: '/conference', label: t('nav.conference') },
                { to: '/gym', label: t('nav.gym') },
                { to: '/facilities', label: t('nav.facilities') },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    className="flex min-h-[40px] items-center text-sm transition hover:text-gold"
                    to={link.to}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">
              {t('footer.contact')}
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-gold">location_on</span>
                <span>{ADDRESS}</span>
              </li>
              <li className="flex gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-gold">call</span>
                <a className="transition hover:text-gold" href={PHONE_HREF}>
                  {PHONE}
                </a>
              </li>
              <li className="flex gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-gold">mail</span>
                <a className="transition hover:text-gold" href={EMAIL_HREF}>
                  {EMAIL}
                </a>
              </li>
              <li className="flex gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-gold">schedule</span>
                <span>{t('footer.hoursValue')}</span>
              </li>
            </ul>
            <a
              href={MAP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="link-arrow mt-3 text-gold hover:text-gold-soft"
            >
              {t('footer.map')}
            </a>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="container-page flex flex-col gap-3 py-5 text-[11px] sm:flex-row sm:items-center sm:justify-between">
            <p>
              © <span>{new Date().getFullYear()}</span> West Premier Hotel.{' '}
              <span>{t('footer.rights')}</span>
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <Link className="transition hover:text-gold" to="/contact">
                {t('footer.privacy')}
              </Link>
              <Link className="transition hover:text-gold" to="/contact">
                {t('footer.terms')}
              </Link>
              <Link className="transition hover:text-gold" to="/dashboard">
                {t('footer.staff')}
              </Link>
              <span className="inline-flex items-center gap-1.5 text-white/50">
                <span className="material-symbols-outlined text-[14px] text-gold">verified_user</span>
                Secure booking
              </span>
            </div>
          </div>
        </div>
      </footer>

      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_TEXT}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('whatsapp.label')}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1FA855] text-white shadow-lift transition hover:scale-105 hover:bg-[#178a45] focus-visible:ring-offset-2"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Zm-5.42 7.1h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.45-4.44 9.88-9.9 9.88Zm8.42-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.31-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41Z" />
        </svg>
      </a>
    </>
  );
}
