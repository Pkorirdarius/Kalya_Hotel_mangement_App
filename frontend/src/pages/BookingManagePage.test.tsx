import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../components/ToastProvider';
import { I18nProvider } from '../i18n-context';
import { createQueryClient } from '../lib/query/queryClient';
import { BookingManagePage } from './BookingManagePage';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function bookingBody(overrides: Record<string, unknown> = {}) {
  return {
    reference: 'WP-2026-0001',
    status: 'confirmed',
    status_display: 'Confirmed',
    room_type: 'standard-executive',
    room_type_name: 'Standard Executive',
    room_type_image: '',
    rate_plan: 'flexible',
    meal_plan: 'breakfast',
    meal_plan_name: 'Breakfast included',
    checkin: '2026-12-01',
    checkout: '2026-12-03',
    nights: 2,
    guests: 2,
    guest_name: 'Amina Otieno',
    first_name: 'Amina',
    last_name: 'Otieno',
    email: 'amina@example.com',
    phone: '254712345678',
    country: 'Kenya',
    accommodation_total: 17000,
    meal_total: 2400,
    discount_total: 0,
    total: 19400,
    cancellation_cutoff_hours: 48,
    free_cancellation_until: '2027-11-29T14:00:00Z',
    hold_expires_at: null,
    can_cancel: true,
    created_at: '2026-11-12T09:00:00Z',
    latest_payment: {
      reference: 'PAY-0001',
      provider: 'mpesa',
      provider_display: 'M-Pesa',
      status: 'succeeded',
      amount: 19400,
      checkout_request_id: '',
      failure_message: '',
      redirect_url: '',
      requires_review: false,
      paid_at: '2026-11-12T09:05:00Z',
      instructions: {},
    },
    status_events: [],
    ...overrides,
  };
}

function renderManagePage(initialEntry = '/booking/manage?reference=WP-2026-0001') {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: false },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <BookingManagePage />
          </MemoryRouter>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

function mockFetch(options: {
  booking?: Record<string, unknown>;
  lookupStatus?: number;
  cancelStatus?: number;
  cancelMessage?: string;
} = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/auth/csrf/')) {
      return jsonResponse(200, {});
    }
    if (url.includes('/cancel/') && method === 'POST') {
      const status = options.cancelStatus ?? 200;
      if (status !== 200) {
        return jsonResponse(status, {
          error: {
            code: 'conflict',
            message:
              options.cancelMessage ??
              'The free cancellation deadline has passed. Please contact the front desk.',
            fields: null,
            request_id: null,
          },
        });
      }
      return jsonResponse(200, bookingBody({ ...options.booking, status: 'cancelled', can_cancel: false }));
    }
    if (url.includes('/bookings/') && method === 'GET') {
      const status = options.lookupStatus ?? 200;
      if (status !== 200) {
        return jsonResponse(status, {
          error: {
            code: 'not_found',
            message: 'We could not find a booking with those details.',
            fields: null,
            request_id: null,
          },
        });
      }
      return jsonResponse(200, bookingBody(options.booking));
    }
    return jsonResponse(404, { detail: `Unhandled ${method} ${url}` });
  });
}

async function lookup(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email address'), 'amina@example.com');
  await user.click(screen.getByRole('button', { name: 'Find booking' }));
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BookingManagePage', () => {
  it('prefills the reference and looks up a booking with one contact detail', async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderManagePage();

    expect(screen.getByLabelText('Booking reference')).toHaveValue('WP-2026-0001');

    await lookup(user);

    expect(await screen.findByText('Standard Executive')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Payment received')).toBeInTheDocument();
    expect(screen.getByText(/Free cancellation until/)).toBeInTheDocument();

    const lookupCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).includes('/bookings/WP-2026-0001/') &&
        (init?.method ?? 'GET') === 'GET',
    );
    expect(lookupCall).toBeTruthy();
    expect(String(lookupCall?.[0])).toContain('email=amina%40example.com');
    expect(String(lookupCall?.[0])).not.toContain('phone=');
  });

  it('cancels after a two-step confirmation', async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderManagePage();

    await lookup(user);
    await screen.findByText('Standard Executive');

    await user.click(screen.getByRole('button', { name: 'Cancel this booking' }));
    expect(screen.getByText('Cancel this booking?')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Reason (optional)'), 'Plans changed');
    await user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }));

    expect(await screen.findByText('Booking cancelled')).toBeInTheDocument();
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0);

    const cancelCall = fetchMock.mock.calls.find(
      ([input, init]) => String(input).includes('/cancel/') && init?.method === 'POST',
    );
    expect(cancelCall).toBeTruthy();
    expect(JSON.parse(String(cancelCall?.[1]?.body))).toEqual({ reason: 'Plans changed' });
  });

  it('refuses online cancellation after the free cancellation deadline', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        booking: {
          free_cancellation_until: '2026-11-01T14:00:00Z',
          can_cancel: false,
        },
      }),
    );
    const user = userEvent.setup();
    renderManagePage();

    await lookup(user);

    expect(await screen.findByText(/The free cancellation deadline was/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancel this booking' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/can no longer be cancelled online/)).toBeInTheDocument();
  });

  it('shows the server cutoff message when a cancellation is refused', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        cancelStatus: 409,
        cancelMessage:
          'The free cancellation deadline has passed. Please contact the front desk.',
      }),
    );
    const user = userEvent.setup();
    renderManagePage();

    await lookup(user);
    await screen.findByText('Standard Executive');
    await user.click(screen.getByRole('button', { name: 'Cancel this booking' }));
    await user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('The free cancellation deadline has passed. Please contact the front desk.');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Yes, cancel booking' })).toBeInTheDocument(),
    );
  });

  it('explains when no booking matches the details', async () => {
    vi.stubGlobal('fetch', mockFetch({ lookupStatus: 404 }));
    const user = userEvent.setup();
    renderManagePage();

    await lookup(user);

    expect(
      await screen.findByText(/We could not find a booking with those details/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Standard Executive')).not.toBeInTheDocument();
  });
});
