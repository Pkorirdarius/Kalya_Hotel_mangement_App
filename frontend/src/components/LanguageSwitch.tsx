import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n-context';
import { localizedPath, stripLanguagePrefix } from '../lib/routes';

interface LanguageSwitchProps {
  className?: string;
}

export function LanguageSwitch({ className = '' }: LanguageSwitchProps) {
  const { language, setLanguage, t } = useI18n();
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();

  const switchLanguage = () => {
    const next = language === 'en' ? 'sw' : 'en';
    const target = localizedPath(`${stripLanguagePrefix(pathname)}${search}${hash}`, next);
    setLanguage(next);
    navigate(target);
  };

  return (
    <button
      type="button"
      data-language-switch
      onClick={switchLanguage}
      aria-label={t('header.language')}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-forest px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm transition hover:bg-forest-light ${className}`}
    >
      <span className={language === 'en' ? 'text-gold' : 'text-white/60'}>EN</span>
      <span className="text-white/30">|</span>
      <span className={language === 'sw' ? 'text-gold' : 'text-white/60'}>SW</span>
    </button>
  );
}
