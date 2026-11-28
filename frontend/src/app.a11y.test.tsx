import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import { QueryProvider } from './components/QueryProvider';
import { ToastProvider } from './components/ToastProvider';
import { setLanguage } from './i18n';
import { I18nProvider } from './i18n-context';
import { createQueryClient } from './lib/query/queryClient';

const PUBLIC_PAGES = ['/', '/rooms', '/facilities', '/offers', '/contact', '/booking'];
const LANGUAGES = [
  { prefix: '', language: 'en' as const },
  { prefix: '/sw', language: 'sw' as const },
];

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function renderApp(path: string) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  setLanguage(path.startsWith('/sw') ? 'sw' : 'en', false);

  return render(
    <QueryProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <I18nProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </I18nProvider>
      </MemoryRouter>
    </QueryProvider>,
  );
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    } as Storage,
    configurable: true,
  });
  window.scrollTo = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse([])));
});

afterEach(() => {
  vi.unstubAllGlobals();
  setLanguage('en', false);
});

describe('public page accessibility', () => {
  for (const { prefix, language } of LANGUAGES) {
    for (const page of PUBLIC_PAGES) {
      it(`has no axe violations on ${language} ${page}`, async () => {
        const { container } = renderApp(`${prefix}${page}`);
        await screen.findByRole('heading', { level: 1 }, { timeout: 5_000 });

        // jsdom cannot evaluate colour contrast or cross-frame content; the
        // real-browser axe pass is covered by the Playwright accessibility spec.
        const results = await axe.run(container, {
          iframes: false,
          rules: { 'color-contrast': { enabled: false } },
        });

        expect(results.violations.map((violation) => violation.id)).toEqual([]);
      });
    }
  }
});
