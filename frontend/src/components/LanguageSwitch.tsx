import { useI18n } from '../i18n-context';

interface LanguageSwitchProps {
  className?: string;
}

export function LanguageSwitch({ className = '' }: LanguageSwitchProps) {
  const { language, toggleLanguage, t } = useI18n();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={t('header.language')}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-forest px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm transition hover:bg-forest-light ${className}`}
    >
      <span className={language === 'en' ? 'text-gold' : 'text-white/60'}>EN</span>
      <span className="text-white/30">|</span>
      <span className={language === 'sw' ? 'text-gold' : 'text-white/60'}>SW</span>
    </button>
  );
}
