import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (description) {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (meta) {
        meta.content = description;
      }
    }
  }, [title, description]);
}

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
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
