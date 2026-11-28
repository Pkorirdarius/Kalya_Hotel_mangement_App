import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { trackPageview } from '../lib/analytics';
import { languageFromPath, localizedPath, stripLanguagePrefix } from '../lib/routes';

type AlternateLanguage = 'en' | 'sw' | 'x-default';

function setAlternate(hreflang: AlternateLanguage, href: string) {
  let link = document.head.querySelector<HTMLLinkElement>(
    `link[rel="alternate"][hreflang="${hreflang}"]`,
  );
  if (!link) {
    link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = hreflang;
    document.head.appendChild(link);
  }
  link.href = href;
}

function removeAlternates() {
  document.head
    .querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')
    .forEach((link) => link.remove());
}

export function usePageMeta(title: string, description?: string, noindex = false) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = title;

    if (description) {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (meta) {
        meta.content = description;
      }
      const ogDescription = document.querySelector<HTMLMetaElement>(
        'meta[property="og:description"]',
      );
      if (ogDescription) ogDescription.content = description;
      const twitterDescription = document.querySelector<HTMLMetaElement>(
        'meta[name="twitter:description"]',
      );
      if (twitterDescription) twitterDescription.content = description;
    }

    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = title;
    const twitterTitle = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.content = title;

    const language = languageFromPath(pathname);
    const barePath = stripLanguagePrefix(pathname);
    const enPath = localizedPath(barePath, 'en');
    const swPath = localizedPath(barePath, 'sw');
    const canonicalPath = language === 'sw' ? swPath : enPath;

    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const origin = canonical?.dataset.origin ?? '';
    if (canonical) {
      canonical.href = `${origin}${canonicalPath}`;
    }

    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = `${origin}${canonicalPath}`;

    const ogLocale = document.querySelector<HTMLMetaElement>('meta[property="og:locale"]');
    if (ogLocale) ogLocale.content = language === 'sw' ? 'sw_KE' : 'en_KE';

    const ogLocaleAlternate = document.querySelector<HTMLMetaElement>(
      'meta[property="og:locale:alternate"]',
    );
    if (ogLocaleAlternate) ogLocaleAlternate.content = language === 'sw' ? 'en_KE' : 'sw_KE';

    if (noindex) {
      removeAlternates();
    } else {
      setAlternate('en', `${origin}${enPath}`);
      setAlternate('sw', `${origin}${swPath}`);
      setAlternate('x-default', `${origin}${enPath}`);
    }

    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (robots) {
      robots.content = noindex ? 'noindex,nofollow' : 'index,follow';
    }
  }, [title, description, noindex, pathname]);
}

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

export function RouteAnalytics() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageview(pathname);
  }, [pathname]);

  return null;
}

interface PageHeroProps {
  eyebrow: string;
  title: string;
  text: string;
  children?: ReactNode;
  className?: string;
}

export function PageHero({ eyebrow, title, text, children, className = '' }: PageHeroProps) {
  return (
    <section className={`border-b border-line bg-sand/60 py-12 md:py-16 ${className}`}>
      <div className="container-page max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-4">{title}</h1>
        <p className="lede mt-5">{text}</p>
        {children ? <div className="mt-6 flex flex-wrap gap-2">{children}</div> : null}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  text,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="heading mt-3">{title}</h2>
      {text ? <p className="lede mt-4">{text}</p> : null}
    </div>
  );
}
