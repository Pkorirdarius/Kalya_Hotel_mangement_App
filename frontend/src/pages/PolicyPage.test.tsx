import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../components/ToastProvider';
import { setLanguage } from '../i18n';
import { I18nProvider } from '../i18n-context';
import { createQueryClient } from '../lib/query/queryClient';
import { PolicyPage } from './PolicyPage';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function renderPolicy(status = 200) {
  const policy = {
    slug: 'privacy',
    title_en: 'Privacy notice',
    title_sw: 'Taarifa ya faragha',
    body_en: 'First paragraph.\n\nSecond paragraph.',
    body_sw: 'Aya ya kwanza.\n\nAya ya pili.',
    version: '2026-11-draft',
    updated_at: '2026-11-15T10:00:00Z',
    needs_confirmation: true,
  };
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: false },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => jsonResponse(status, status === 200 ? policy : { detail: 'Not found' })),
  );
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/privacy']}>
            <PolicyPage slug="privacy" />
          </MemoryRouter>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  setLanguage('en', false);
});

describe('PolicyPage', () => {
  it('renders the CMS policy in English with the draft warning', async () => {
    renderPolicy();

    expect(await screen.findByRole('heading', { name: 'Privacy notice' })).toBeInTheDocument();
    expect(screen.getByText('First paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
    expect(screen.getByText(/Draft wording/)).toBeInTheDocument();
    expect(screen.getByText(/Policy version 2026-11-draft/)).toBeInTheDocument();
  });

  it('switches to the Swahili policy text', async () => {
    renderPolicy();

    expect(await screen.findByRole('heading', { name: 'Privacy notice' })).toBeInTheDocument();
    act(() => setLanguage('sw'));

    expect(await screen.findByRole('heading', { name: 'Taarifa ya faragha' })).toBeInTheDocument();
    expect(screen.getByText('Aya ya kwanza.')).toBeInTheDocument();
    expect(screen.queryByText('First paragraph.')).not.toBeInTheDocument();
  });

  it('offers a contact route when the policy API fails', async () => {
    renderPolicy(500);

    expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact');
  });
});
