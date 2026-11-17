import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NewsletterForm } from './NewsletterForm';
import { ToastProvider } from './ToastProvider';
import { I18nProvider } from '../i18n-context';
import { createQueryClient } from '../lib/query/queryClient';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function renderForm() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ToastProvider>
          <NewsletterForm />
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('NewsletterForm', () => {
  it('sends the email and consent to the API before showing success', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/auth/csrf/')) return jsonResponse(200, {});
      if (String(input).includes('/marketing/newsletter/') && init?.method === 'POST') {
        return jsonResponse(201, { subscribed: true, already_subscribed: false });
      }
      return jsonResponse(404, { detail: 'Unhandled' });
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/email address/i), 'reader@example.com');
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Asante!');
    const call = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).includes('/marketing/newsletter/') && init?.method === 'POST',
    );
    expect(call).toBeTruthy();
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      email: 'reader@example.com',
      consent: true,
      language: 'en',
      source: 'website',
      website: '',
    });
    const body = JSON.parse(String(call?.[1]?.body)) as Record<string, unknown>;
    expect(typeof body.form_started_at).toBe('number');
  });

  it('shows the server error and keeps the email when the API rejects it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes('/auth/csrf/')) return jsonResponse(200, {});
        if (String(input).includes('/marketing/newsletter/') && init?.method === 'POST') {
          return jsonResponse(400, {
            error: {
              code: 'validation_error',
              message: 'Some fields need attention.',
              fields: { email: ['Enter a valid email address.'] },
              request_id: null,
            },
          });
        }
        return jsonResponse(404, { detail: 'Unhandled' });
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/email address/i), 'reader@example.com');
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    await waitFor(() =>
      expect(screen.getByLabelText(/email address/i)).toHaveValue('reader@example.com'),
    );
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  });
});
