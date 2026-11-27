import { Link } from './LocalizedLink';
import { HOTEL } from '../config/hotel';

// Icon-only crops of the supplied artwork. The light-on-dark variant is used
// on navy/forest surfaces; every variant is transparent so no white badge or
// square corners appear behind the mark.
export const BRAND_MARK_SRC = '/west-premier-logo-mark.svg';
export const BRAND_MARK_DARK_SRC = '/west-premier-logo-dark.svg';

interface BrandLockupProps {
  dark?: boolean;
  compact?: boolean;
  className?: string;
}

/** Shared mark + live-text lockup used by the header, footer and front desk. */
export function BrandLockup({ dark = false, compact = false, className = '' }: BrandLockupProps) {
  const markSize = compact ? 'h-9 w-9 sm:h-14 sm:w-14' : 'h-14 w-14';
  const nameSize = compact ? 'text-[15px] sm:text-[22px]' : 'text-[22px]';
  const taglineSize = compact
    ? 'text-[8px] tracking-[0.16em] sm:text-[10px] sm:tracking-[0.28em]'
    : 'text-[10px] tracking-[0.28em]';
  const taglineGap = compact ? 'mt-1 sm:mt-1.5' : 'mt-1.5';

  return (
    <span className={`flex min-w-0 items-center gap-2 bg-transparent sm:gap-3 ${className}`}>
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-transparent transition group-hover:scale-[1.03] ${markSize}`}
      >
        <img
          src={dark ? BRAND_MARK_DARK_SRC : BRAND_MARK_SRC}
          alt=""
          aria-hidden="true"
          className="h-full w-full bg-transparent object-contain"
        />
      </span>
      <span className="flex min-w-0 flex-col whitespace-nowrap bg-transparent">
        <span
          className={`bg-transparent font-display font-semibold uppercase leading-none tracking-[0.04em] transition group-hover:opacity-80 ${
            dark ? 'text-[#F4EFE9]' : 'text-forest-dark'
          } ${nameSize}`}
        >
          {HOTEL.shortName}
        </span>
        <span
          className={`bg-transparent font-bold uppercase leading-none ${
            dark ? 'text-[#C8803A]' : 'text-[#955F26]'
          } ${taglineGap} ${taglineSize}`}
        >
          {HOTEL.logo.subline}
        </span>
      </span>
    </span>
  );
}

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
      className="group flex min-w-0 items-center"
    >
      <BrandLockup dark={dark} compact />
    </Link>
  );
}
