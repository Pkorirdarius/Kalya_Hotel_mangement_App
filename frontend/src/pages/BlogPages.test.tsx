import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../components/ToastProvider';
import { setLanguage } from '../i18n';
import { I18nProvider } from '../i18n-context';
import { createQueryClient } from '../lib/query/queryClient';
import { BlogIndexPage } from './BlogIndexPage';
import { BlogPostPage } from './BlogPostPage';

const POST = {
  slug: 'first-post',
  title_en: 'First story',
  title_sw: 'Hadithi ya kwanza',
  excerpt_en: 'A short English excerpt.',
  excerpt_sw: 'Muhtasari mfupi kwa Kiswahili.',
  body_en: 'First paragraph.\n\nSecond paragraph.',
  body_sw: 'Aya ya kwanza.\n\nAya ya pili.',
  category: 'news',
  published_at: '2026-01-15T10:00:00Z',
  needs_confirmation: true,
};

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function renderPage(path: string, element: ReactNode) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(path.startsWith('/blog/') && path !== '/blog' ? POST : [POST])));
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/blog" element={element} />
              <Route path="/blog/:slug" element={element} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  act(() => setLanguage('en', false));
});

describe('CMS blog pages', () => {
  it('renders the post index and localized links', async () => {
    setLanguage('en', false);
    renderPage('/blog', <BlogIndexPage />);

    expect(await screen.findByRole('heading', { name: 'The journal' })).toBeInTheDocument();
    expect(await screen.findByText('First story')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read story' })).toHaveAttribute(
      'href',
      '/blog/first-post',
    );

    act(() => setLanguage('sw'));
    expect(await screen.findByRole('heading', { name: 'Jarida' })).toBeInTheDocument();
    expect(await screen.findByText('Hadithi ya kwanza')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Soma hadithi' })).toHaveAttribute(
      'href',
      '/sw/blog/first-post',
    );
  });

  it('renders a CMS post with English fallback and draft warning', async () => {
    setLanguage('en', false);
    renderPage('/blog/first-post', <BlogPostPage />);

    expect(await screen.findByRole('heading', { name: 'First story' })).toBeInTheDocument();
    expect(screen.getByText('First paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
    expect(screen.getByText(/Draft story/)).toBeInTheDocument();

    act(() => setLanguage('sw'));
    expect(await screen.findByRole('heading', { name: 'Hadithi ya kwanza' })).toBeInTheDocument();
    expect(screen.getByText('Aya ya kwanza.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rudi kwenye jarida' })).toHaveAttribute(
      'href',
      '/sw/blog',
    );
  });

  it('falls back to English when a Swahili translation is missing', async () => {
    const client = createQueryClient();
    client.setDefaultOptions({ queries: { retry: false } });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          slug: 'english-only',
          title_en: 'English only',
          body_en: 'English body.',
          published_at: null,
        }),
      ),
    );

    setLanguage('sw', false);
    render(
      <QueryClientProvider client={client}>
        <I18nProvider>
          <MemoryRouter initialEntries={['/sw/blog/english-only']}>
            <Routes>
              <Route path="/sw/blog/:slug" element={<BlogPostPage />} />
            </Routes>
          </MemoryRouter>
        </I18nProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'English only' })).toBeInTheDocument();
    expect(screen.getByText('English body.')).toBeInTheDocument();
  });
});
