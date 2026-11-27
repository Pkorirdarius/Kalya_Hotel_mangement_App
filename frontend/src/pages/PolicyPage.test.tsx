import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../components/ToastProvider';
import { setLanguage } from '../i18n';
import { I18nProvider } from '../i18n-context';
import { queryKeys } from '../lib/query/keys';
import { createQueryClient } from '../lib/query/queryClient';
import { PolicyPage } from './PolicyPage';

const FIND_TIMEOUT = 5000;

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const policy = {
  slug: 'privacy',
  title_en: 'Privacy notice',
  title_sw: 'Taarifa ya faragha',
  body_en: 'First paragraph.\n\nSecond paragraph.',
  body_sw: 'Aya ya kwanza.\n\nAya ya pili.',
  version: '2026-11-approved',
  updated_at: '2026-11-15T10:00:00Z',
};

function renderPolicy(
  status = 200,
  body: unknown = policy,
  slug: 'privacy' | 'terms' | 'cancellation' = 'privacy',
) {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: false },
  });
  client.setQueryDefaults(queryKeys.policy(slug), { retry: false });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => jsonResponse(status, status === 200 ? body : { detail: 'Not found' })),
  );
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[`/${slug}`]}>
            <PolicyPage slug={slug} />
          </MemoryRouter>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubEnv('VITE_ANALYTICS_DOMAIN', '');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  setLanguage('en', false);
});

describe('PolicyPage', () => {
  it('renders approved CMS policy text in English', async () => {
    renderPolicy();

    expect(
      await screen.findByRole('heading', { name: 'Privacy notice' }, { timeout: FIND_TIMEOUT }),
    ).toBeInTheDocument();
    expect(screen.getByText('First paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
    expect(screen.queryByText(/Draft wording/)).not.toBeInTheDocument();
    expect(screen.getByText(/Policy version 2026-11-approved/)).toBeInTheDocument();
  });

  it('switches to the Swahili policy text', async () => {
    renderPolicy();

    expect(
      await screen.findByRole('heading', { name: 'Privacy notice' }, { timeout: FIND_TIMEOUT }),
    ).toBeInTheDocument();
    act(() => setLanguage('sw'));

    expect(
      await screen.findByRole('heading', { name: 'Taarifa ya faragha' }, { timeout: FIND_TIMEOUT }),
    ).toBeInTheDocument();
    expect(screen.getByText('Aya ya kwanza.')).toBeInTheDocument();
    expect(screen.queryByText('First paragraph.')).not.toBeInTheDocument();
  });

  it('offers a contact route when the policy API fails', async () => {
    renderPolicy(500);

    expect(
      await screen.findByText(/temporarily unavailable/, undefined, { timeout: FIND_TIMEOUT }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact');
  });

  it('never shows wording for a policy still pending approval', async () => {
    renderPolicy(404);

    expect(
      await screen.findByText(/temporarily unavailable/, undefined, { timeout: FIND_TIMEOUT }),
    ).toBeInTheDocument();
    expect(screen.queryByText('First paragraph.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Policy version/)).not.toBeInTheDocument();
  });

  it('shows the analytics notice on privacy only when analytics is enabled', async () => {
    vi.stubEnv('VITE_ANALYTICS_DOMAIN', 'hotel.example');
    renderPolicy();

    expect(
      await screen.findByText(/cookieless Plausible/, undefined, { timeout: FIND_TIMEOUT }),
    ).toBeInTheDocument();
  });

  it('hides the analytics notice when analytics is off', async () => {
    renderPolicy();
    expect(
      await screen.findByRole('heading', { name: 'Privacy notice' }, { timeout: FIND_TIMEOUT }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/cookieless Plausible/)).not.toBeInTheDocument();
  });

  it('does not add the privacy analytics notice to other policies', async () => {
    vi.stubEnv('VITE_ANALYTICS_DOMAIN', 'hotel.example');
    renderPolicy(200, { ...policy, slug: 'terms' }, 'terms');

    expect(
      await screen.findByRole('heading', { name: 'Privacy notice' }, { timeout: FIND_TIMEOUT }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/cookieless Plausible/)).not.toBeInTheDocument();
  });
});
