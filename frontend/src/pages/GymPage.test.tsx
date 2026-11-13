import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../components/ToastProvider';
import { I18nProvider } from '../i18n-context';
import { createQueryClient } from '../lib/query/queryClient';
import { todayISO } from '../utils';
import { GymPage } from './GymPage';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function dayPassBody(request: Record<string, unknown>) {
  return {
    reference: 'GYM-9001',
    date: request.date,
    full_name: request.full_name,
    phone: request.phone,
    email: request.email,
    amount: 500,
    payment_method: request.payment_method,
    payment_method_display: 'Pay at reception',
    status: 'reserved',
    status_display: 'Reserved',
    qr_token: 'token',
    qr_url: null,
    paid_at: null,
    created_at: '2026-11-12T09:00:00Z',
  };
}

function renderGymPage() {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: false },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/gym']}>
            <GymPage />
          </MemoryRouter>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

function mockFetch(options: {
  remaining?: number;
  price?: number;
  createStatus?: number;
  createBody?: unknown;
} = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/auth/csrf/')) return jsonResponse(200, {});
    if (url.includes('/facilities/gym/availability/') && method === 'GET') {
      const date = new URL(url, 'http://localhost').searchParams.get('date') ?? todayISO();
      return jsonResponse(200, {
        date,
        remaining: options.remaining ?? 7,
        price: options.price ?? 500,
      });
    }
    if (url.includes('/facilities/gym/day-passes/') && method === 'POST') {
      if (options.createStatus && options.createStatus !== 201) {
        return jsonResponse(options.createStatus, options.createBody);
      }
      return jsonResponse(201, {
        day_pass: dayPassBody(JSON.parse(String(init?.body)) as Record<string, unknown>),
      });
    }
    return jsonResponse(404, { detail: `Unhandled ${method} ${url}` });
  });
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole('button', { name: 'Book a day pass' })[0]);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

describe('GymPage', () => {
  it('shows live places and price, then reserves a reception day pass', async () => {
    const today = todayISO();
    const fetchMock = mockFetch({ remaining: 7, price: 500 });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderGymPage();

    await openDialog(user);
    expect(
      await screen.findByText('7 places left · KES 500 per person'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Full name'), 'Amina Otieno');
    await user.type(screen.getByLabelText('Phone number'), '0712 345 678');
    await user.click(screen.getByRole('button', { name: 'Reserve day pass' }));

    expect(await screen.findByText('Day pass reserved')).toBeInTheDocument();
    expect(screen.getByText('GYM-9001')).toBeInTheDocument();
    expect(screen.getAllByText(/KES 500/).length).toBeGreaterThan(0);

    const createCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).includes('/facilities/gym/day-passes/') &&
        init?.method === 'POST',
    );
    expect(createCall).toBeTruthy();
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      date: today,
      full_name: 'Amina Otieno',
      phone: '254712345678',
      payment_method: 'reception',
    });
  });

  it('disables the form when the gym is fully booked', async () => {
    vi.stubGlobal('fetch', mockFetch({ remaining: 0 }));
    const user = userEvent.setup();
    renderGymPage();

    await openDialog(user);
    expect(
      await screen.findByText(/fully booked for this date/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reserve day pass' })).toBeDisabled();
  });

  it('shows the server message when the date is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        createStatus: 400,
        createBody: {
          error: {
            code: 'validation_error',
            message: 'That date is not available.',
            fields: { date: ['The gym is closed on this date.'] },
            request_id: null,
          },
        },
      }),
    );
    const user = userEvent.setup();
    renderGymPage();

    await openDialog(user);
    await user.type(screen.getByLabelText('Full name'), 'Amina Otieno');
    await user.type(screen.getByLabelText('Phone number'), '0712 345 678');
    await user.click(screen.getByRole('button', { name: 'Reserve day pass' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The gym is closed on this date.',
    );
    expect(screen.getAllByText('The gym is closed on this date.').length).toBeGreaterThan(0);
  });
});
