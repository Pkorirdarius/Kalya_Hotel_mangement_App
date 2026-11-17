import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../components/ToastProvider';
import { I18nProvider } from '../i18n-context';
import { createQueryClient } from '../lib/query/queryClient';
import { ContactPage } from './ContactPage';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function renderContactPage() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/contact']}>
            <ContactPage />
          </MemoryRouter>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ContactPage', () => {
  it('posts the message to the API and shows the returned reference', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/csrf/')) return jsonResponse(200, {});
      if (url.includes('/marketing/contact/') && init?.method === 'POST') {
        return jsonResponse(201, {
          message: {
            reference: 'CM-4821',
            name: 'Amina Otieno',
            email: 'amina@example.com',
            phone: '254712345678',
            topic: 'general',
            message: 'Do you have a room for two nights?',
            status: 'new',
            created_at: '2026-11-12T09:00:00Z',
          },
        });
      }
      return jsonResponse(404, { detail: `Unhandled ${url}` });
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderContactPage();

    await user.type(screen.getByLabelText('Your name'), 'Amina Otieno');
    await user.type(screen.getByLabelText('Email'), 'amina@example.com');
    await user.type(screen.getByLabelText('Message'), 'Do you have a room for two nights?');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText(/CM-4821/)).toBeInTheDocument();

    const call = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).includes('/marketing/contact/') && init?.method === 'POST',
    );
    expect(call).toBeTruthy();
    const body = JSON.parse(String(call?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      name: 'Amina Otieno',
      email: 'amina@example.com',
      message: 'Do you have a room for two nights?',
      website: '',
    });
    expect(typeof body.form_started_at).toBe('number');
  });

  it('keeps the form and shows an error when the API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/auth/csrf/')) return jsonResponse(200, {});
        if (url.includes('/marketing/contact/') && init?.method === 'POST') {
          return jsonResponse(500, {
            error: {
              code: 'server_error',
              message: 'Something went wrong.',
              fields: null,
              request_id: null,
            },
          });
        }
        return jsonResponse(404, { detail: `Unhandled ${url}` });
      }),
    );
    const user = userEvent.setup();
    renderContactPage();

    await user.type(screen.getByLabelText('Your name'), 'Amina Otieno');
    await user.type(screen.getByLabelText('Email'), 'amina@example.com');
    await user.type(screen.getByLabelText('Message'), 'Do you have a room for two nights?');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Your name')).toHaveValue('Amina Otieno'),
    );
    expect(screen.queryByText(/CM-/)).not.toBeInTheDocument();
  });
});
