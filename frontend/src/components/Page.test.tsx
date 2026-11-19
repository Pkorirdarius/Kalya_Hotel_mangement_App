import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RouteAnalytics, usePageMeta } from './Page';

function Meta({
  title,
  description,
  noindex,
}: {
  title: string;
  description?: string;
  noindex?: boolean;
}) {
  usePageMeta(title, description, noindex);
  return <p>{title}</p>;
}

function seedDocument() {
  document.head.innerHTML = `
    <title>Initial</title>
    <meta name="description" content="Initial description" />
    <meta name="robots" content="index,follow" />
    <meta property="og:title" content="Initial" />
    <meta property="og:description" content="Initial description" />
    <meta property="og:url" content="https://example.test/" />
    <meta property="og:locale" content="en_KE" />
    <meta property="og:locale:alternate" content="sw_KE" />
    <meta name="twitter:title" content="Initial" />
    <meta name="twitter:description" content="Initial description" />
    <link rel="canonical" href="https://example.test/" data-origin="https://example.test" />
  `;
}

describe('usePageMeta', () => {
  beforeEach(seedDocument);

  it('updates the title, descriptions and canonical URL for a public page', () => {
    render(
      <MemoryRouter initialEntries={['/rooms']}>
        <Meta title="Rooms & Suites" description="Three calm room types." />
      </MemoryRouter>,
    );

    expect(screen.getByText('Rooms & Suites')).toBeInTheDocument();
    expect(document.title).toBe('Rooms & Suites');
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content,
    ).toBe('Three calm room types.');
    expect(
      document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content,
    ).toBe('Rooms & Suites');
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')
        ?.content,
    ).toBe('Three calm room types.');
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content,
    ).toBe('index,follow');
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://example.test/rooms');
    expect(
      document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content,
    ).toBe('https://example.test/rooms');
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="en"]')?.href,
    ).toBe('https://example.test/rooms');
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="sw"]')?.href,
    ).toBe('https://example.test/sw/rooms');
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="x-default"]')?.href,
    ).toBe('https://example.test/rooms');
  });

  it('uses the Kiswahili canonical, Open Graph locale and alternates', () => {
    render(
      <MemoryRouter initialEntries={['/sw/rooms']}>
        <Meta title="Vyumba" description="Vyumba tulivu." />
      </MemoryRouter>,
    );

    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://example.test/sw/rooms');
    expect(
      document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content,
    ).toBe('https://example.test/sw/rooms');
    expect(document.querySelector<HTMLMetaElement>('meta[property="og:locale"]')?.content).toBe(
      'sw_KE',
    );
    expect(
      document.querySelector<HTMLMetaElement>('meta[property="og:locale:alternate"]')?.content,
    ).toBe('en_KE');
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="en"]')?.href,
    ).toBe('https://example.test/rooms');
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="sw"]')?.href,
    ).toBe('https://example.test/sw/rooms');
  });

  it('marks private pages noindex', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Meta title="Dashboard" noindex />
      </MemoryRouter>,
    );

    expect(
      document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content,
    ).toBe('noindex,nofollow');
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://example.test/dashboard');
    expect(document.querySelectorAll('link[rel="alternate"][hreflang]')).toHaveLength(0);
  });
});

describe('RouteAnalytics', () => {
  afterEach(() => {
    delete window.plausible;
  });

  it('sends a pageview only when an analytics function is present', () => {
    const plausible = vi.fn();
    window.plausible = plausible;

    render(
      <MemoryRouter initialEntries={['/booking']}>
        <RouteAnalytics />
      </MemoryRouter>,
    );

    expect(plausible).toHaveBeenCalledWith('pageview', {
      u: `${window.location.origin}/booking`,
    });
  });

  it('does nothing when analytics is not configured', () => {
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/contact']}>
          <RouteAnalytics />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });
});
