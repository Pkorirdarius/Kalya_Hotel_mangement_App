import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../components/ToastProvider';
import { I18nProvider } from '../i18n-context';
import { createQueryClient } from '../lib/query/queryClient';
import { BookingPage } from './BookingPage';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function renderBookingPage() {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: false },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/booking']}>
            <BookingPage />
          </MemoryRouter>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

const availability = [
  {
    room_type: 'standard-executive',
    name: 'Standard Executive',
    available_rooms: 2,
    sleeps: 2,
    fits_guests: true,
    from_price: 8500,
  },
  {
    room_type: 'deluxe-garden-suite',
    name: 'Deluxe Garden Suite',
    available_rooms: 5,
    sleeps: 3,
    fits_guests: true,
    from_price: 12800,
  },
  {
    room_type: 'mara-residence',
    name: 'Mara Residence',
    available_rooms: 3,
    sleeps: 4,
    fits_guests: true,
    from_price: 18500,
  },
];

function quoteBody() {
  return {
    room_type: 'standard-executive',
    room_type_name: 'Standard Executive',
    rate_plan: 'flexible',
    meal_plan: 'breakfast',
    checkin: '2026-12-01',
    checkout: '2026-12-03',
    guests: 2,
    nights: 2,
    currency: 'KES',
    nightly_rates: [],
    accommodation_total: 17000,
    meal_total: 2400,
    discount_percent: 0,
    discount_total: 0,
    tax_total: 0,
    tax_included: true,
    tax_rate_percent: 0,
    total: 19400,
    cancellation_cutoff_hours: 48,
    free_cancellation_until: null,
    available_rooms: 2,
  };
}

const bookingBody = {
  reference: 'WP-2026-0001',
  status: 'pending_payment',
  status_display: 'Pending payment',
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
  phone: '0712345678',
  country: 'Kenya',
  accommodation_total: 17000,
  meal_total: 2400,
  discount_total: 0,
  total: 19400,
  cancellation_cutoff_hours: 48,
  can_cancel: true,
  created_at: '2026-11-12T09:00:00Z',
  hold_expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
  latest_payment: null,
};

function paymentBody(status: 'pending' | 'succeeded' | 'failed') {
  return {
    reference: 'PAY-0001',
    purpose: 'booking',
    purpose_display: 'Booking',
    provider: 'mpesa',
    provider_display: 'M-Pesa',
    status,
    amount: 19400,
    currency: 'KES',
    phone: '0712345678',
    failure_message: status === 'failed' ? 'The request was cancelled.' : '',
    paid_at: status === 'succeeded' ? '2026-11-12T09:05:00Z' : null,
    created_at: '2026-11-12T09:00:00Z',
    instructions: {},
  };
}

function mockFetch(onQuote?: () => Response, bookingOverrides: Record<string, unknown> = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/auth/csrf/')) {
      return jsonResponse(200, {});
    }
    if (url.includes('/payments/methods/')) {
      return jsonResponse(200, {
        methods: [],
        bank: { bank_name: 'Test Bank', account_number: '000123' },
        sandbox: true,
      });
    }
    if (url.includes('/bookings/availability/')) {
      return jsonResponse(200, availability);
    }
    if (url.includes('/bookings/quote/') && method === 'POST') {
      return onQuote ? onQuote() : jsonResponse(200, quoteBody());
    }
    if (url.endsWith('/bookings/') && method === 'POST') {
      return jsonResponse(201, { booking: { ...bookingBody, ...bookingOverrides } });
    }
    if (url.includes('/payments/bookings/') && method === 'POST') {
      return jsonResponse(200, {
        payment: paymentBody('pending'),
        message: 'Approve the prompt on your phone.',
        sandbox: true,
      });
    }
    if (url.includes('/sandbox-complete/') && method === 'POST') {
      return jsonResponse(200, paymentBody('succeeded'));
    }
    if (url.includes('/payments/') && method === 'GET') {
      return jsonResponse(200, paymentBody('pending'));
    }
    return jsonResponse(404, { detail: `Unhandled ${method} ${url}` });
  });
}

async function reachStepTwo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Choose a room' }));
  await screen.findByText('2 rooms left');
  await user.click(screen.getByRole('button', { name: 'Add guest details' }));
  await screen.findByLabelText('First name');
}

async function reachStepFour(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('First name'), 'Amina');
  await user.type(screen.getByLabelText('Last name'), 'Otieno');
  await user.type(screen.getByLabelText('Email address'), 'amina@example.com');
  await user.type(screen.getByLabelText('Phone number'), '0712345678');
  await user.click(screen.getByLabelText(/agree to the booking terms/i));
  await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
  await screen.findByRole('button', { name: /pay & confirm booking/i });
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BookingPage', () => {
  it('completes a sandbox booking from availability to confirmation', async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderBookingPage();

    await reachStepTwo(user);
    await reachStepFour(user);

    expect(screen.getAllByText('KES 19,400').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /pay & confirm booking/i }));

    expect(await screen.findByText('WP-2026-0001')).toBeInTheDocument();
    expect(await screen.findByTestId('payment-countdown')).toHaveTextContent(
      /^\d{2}:\d{2}$/,
    );
    expect(
      await screen.findByRole('button', { name: 'Simulate successful payment' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Simulate successful payment' }));

    expect(await screen.findByText('You are booked.')).toBeInTheDocument();
    expect(screen.getByText('Payment received')).toBeInTheDocument();

    const createCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).endsWith('/bookings/') && (init?.method ?? 'GET') === 'POST',
    );
    expect(createCall).toBeTruthy();
    const createBody = JSON.parse(String(createCall?.[1]?.body));
    expect(createBody.quote).toMatchObject({
      room_type: 'standard-executive',
      meal_plan: 'breakfast',
      guests: 2,
    });
    expect(createBody).toMatchObject({
      first_name: 'Amina',
      last_name: 'Otieno',
      email: 'amina@example.com',
      consent_privacy: true,
    });
    expect(createBody.client_request_id).toBeTruthy();
  });

  it('keeps the guest on the room step when the quote is rejected', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(() =>
        jsonResponse(422, {
          error: {
            code: 'validation_error',
            message: 'Those dates are no longer available.',
            fields: { checkin: ['Those dates are no longer available.'] },
            request_id: null,
          },
        }),
      ),
    );
    const user = userEvent.setup();
    renderBookingPage();

    await user.click(screen.getByRole('button', { name: 'Choose a room' }));
    await screen.findByText('2 rooms left');
    await user.click(screen.getByRole('button', { name: 'Add guest details' }));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Those dates are no longer available.');
    expect(screen.queryByLabelText('First name')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add guest details' })).toBeInTheDocument(),
    );
  });

  it('closes the payment window and hides simulation once the hold expires', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(undefined, { hold_expires_at: '2020-01-01T00:00:00Z' }),
    );
    const user = userEvent.setup();
    renderBookingPage();

    await reachStepTwo(user);
    await reachStepFour(user);
    await user.click(screen.getByRole('button', { name: /pay & confirm booking/i }));

    expect(
      await screen.findByText('The payment window has closed'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('payment-countdown')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Simulate successful payment' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Choose another method' }),
    ).not.toBeInTheDocument();
  });
});
