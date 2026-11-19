import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import { I18nProvider } from './i18n-context';
import { ToastProvider } from './components/ToastProvider';
import { setLanguage } from './i18n';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  } as Storage;
}

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </I18nProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true });
  window.scrollTo = vi.fn();
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  window.history.pushState({}, '', '/');
  setLanguage('en', false);
});

describe('localized routing', () => {
  it('renders unprefixed URLs in English even when Swahili is persisted', async () => {
    window.localStorage.setItem('hotel.language', 'sw');
    renderApp('/no-such-page');

    expect(
      await screen.findByRole('heading', { name: 'This page has checked out.' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('link', { name: 'View rooms' })).toHaveAttribute('href', '/rooms');
  });

  it('renders /sw paths in Kiswahili even when English is persisted', async () => {
    window.localStorage.setItem('hotel.language', 'en');
    window.history.pushState({}, '', '/sw/no-such-page');
    renderApp('/sw/no-such-page');

    expect(
      await screen.findByRole('heading', { name: 'Ukurasa huu umeondoka.' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/sw/no-such-page');
    expect(screen.getByRole('link', { name: 'Tazama vyumba' })).toHaveAttribute(
      'href',
      '/sw/rooms',
    );
  });
});
