import { Link } from 'react-router-dom';

interface LogoProps {
  dark?: boolean;
  onClick?: () => void;
}

export function Logo({ dark = false, onClick }: LogoProps) {
  const wordmark = dark ? 'text-white' : 'text-forest-dark';
  const sub = dark ? 'text-white/55' : 'text-muted';

  return (
    <Link
      to="/"
      onClick={onClick}
      className="group flex items-center gap-3"
      aria-label="West Premier Hotel — home"
    >
      <span
        className={`relative flex h-11 w-11 items-center justify-center rounded-full shadow-soft transition group-hover:scale-[1.03] ${
          dark ? 'bg-white/10 ring-1 ring-white/20' : 'bg-forest'
        }`}
      >
        <span className="font-serif text-2xl leading-none text-gold">W</span>
        <span
          className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ${
            dark ? 'ring-forest-dark' : 'ring-cream'
          }`}
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-serif text-[26px] font-medium tracking-tight ${wordmark}`}>
          West Premier
        </span>
        <span className={`mt-1 text-[9px] font-bold uppercase tracking-[0.32em] ${sub}`}>
          Hotel — Kapenguria
        </span>
      </span>
    </Link>
  );
}
