import { Link } from './LocalizedLink';
import { HOTEL } from '../config/hotel';

// Crops of the supplied brand artwork: a compact emblem for narrow screens and
// the wordmark for wider ones. The full lockup lives at
// /west-premier-logo.svg for pages that need the complete mark.
export const BRAND_MARK_SRC = '/west-premier-logo-mark.svg';
export const BRAND_WORDMARK_SRC = '/west-premier-logo-wordmark.svg';

interface LogoProps {
  dark?: boolean;
  onClick?: () => void;
}

export function Logo({ dark = false, onClick }: LogoProps) {
  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label={`${HOTEL.name} — ${HOTEL.logo.subline}`}
      className="group flex items-center gap-2.5"
    >
      <img
        src={BRAND_MARK_SRC}
        alt=""
        aria-hidden="true"
        className="h-9 w-auto shrink-0 object-contain transition group-hover:scale-[1.03]"
      />
      <span className="hidden flex-col leading-none sm:flex">
        <img
          src={BRAND_WORDMARK_SRC}
          alt=""
          aria-hidden="true"
          className={`h-5 w-auto object-contain transition group-hover:opacity-80 ${
            dark ? 'brightness-0 invert' : ''
          }`}
        />
        <span
          className={`mt-1.5 text-[9px] font-bold uppercase tracking-[0.32em] ${
            dark ? 'text-white/55' : 'text-muted'
          }`}
        >
          {HOTEL.logo.subline}
        </span>
      </span>
    </Link>
  );
}
