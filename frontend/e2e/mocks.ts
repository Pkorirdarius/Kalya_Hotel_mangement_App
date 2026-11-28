import type { Page, Request, Route } from '@playwright/test';

/**
 * Deterministic API fixtures for browser tests. The production bundle still
 * talks to `/api/v1`; only the network layer is replaced, so the E2E specs
 * exercise the real React flow without needing live CMS, mail or payments.
 */

export const TEST_BOOKING_REFERENCE = 'WP-E2E-0001';
export const TEST_PAYMENT_REFERENCE = 'PAY-E2E-0001';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed';
export type StaffRole = 'front_desk' | 'director' | 'marketing';

export interface ApiCall {
  method: string;
  path: string;
  body?: unknown;
}

export interface ApiMockOptions {
  /** Start with a logged-in staff session (for direct /dashboard visits). */
  authenticated?: boolean;
  /** Role returned by the staff session/login mocks. */
  role?: StaffRole;
  /** Status of the booking returned by lookup and create calls. */
  bookingStatus?: string;
  /** Status of the payment returned by poll/initiate calls. */
  paymentStatus?: PaymentStatus;
  /** Return 404 for guest booking lookup. */
  bookingNotFound?: boolean;
  /** Number of room bookings reported as received in the alert window. */
  newBookingCount?: number;
  /** Room types whose availability row should report zero rooms. */
  soldOutRoomTypes?: string[];
}

export interface ApiMocks {
  calls: ApiCall[];
}

function json(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function readBody(request: Request): unknown | undefined {
  const raw = request.postData();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function isoFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function dateFromNow(days: number): string {
  return isoFromNow(days).slice(0, 10);
}

function apiPath(request: Request): string {
  const { pathname } = new URL(request.url());
  return pathname.replace(/^\/api\/v1/, '') || '/';
}

function paymentFixture(
  provider: string,
  status: PaymentStatus,
  reference = TEST_PAYMENT_REFERENCE,
) {
  // Null (not an empty object) lets the UI fall back to the bank details from
  // /payments/methods/ for non-bank providers.
  const instructions =
    provider === 'bank_transfer'
      ? {
          bank_name: 'E2E Bank',
          account_name: 'West Premier Hotel',
          account_number: '0000000001',
          branch: 'Nairobi',
          swift: 'E2EBKE00',
        }
      : null;
  return {
    reference,
    purpose: 'room_booking',
    purpose_display: 'Room booking',
    provider,
    provider_display:
      provider === 'mpesa' ? 'M-Pesa' : provider === 'card' ? 'Card' : 'Bank transfer',
    status,
    amount: 40800,
    currency: 'KES',
    phone: '+254712345678',
    provider_reference: '',
    checkout_request_id: '',
    failure_code: status === 'failed' ? 'payment_failed' : '',
    failure_message: status === 'failed' ? 'The payment was declined.' : '',
    redirect_url: '',
    requires_review: false,
    review_reason: '',
    paid_at: status === 'succeeded' ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
    instructions,
  };
}

function paymentSummaryFixture(status: PaymentStatus) {
  const payment = paymentFixture('mpesa', status);
  return {
    reference: payment.reference,
    provider: payment.provider,
    provider_display: payment.provider_display,
    status: payment.status,
    amount: payment.amount,
    checkout_request_id: payment.checkout_request_id,
    failure_message: payment.failure_message,
    redirect_url: payment.redirect_url,
    requires_review: payment.requires_review,
    paid_at: payment.paid_at,
    instructions: payment.instructions,
  };
}

function bookingFixture(status: string, paymentStatus: PaymentStatus) {
  return {
    reference: TEST_BOOKING_REFERENCE,
    status,
    status_display: status.replace(/_/g, ' '),
    room_type: 'superior',
    room_type_name: 'Superior Room',
    room_type_image: '',
    rate_plan: 'flexible',
    meal_plan: 'breakfast',
    meal_plan_name: 'Breakfast',
    checkin: dateFromNow(7),
    checkout: dateFromNow(9),
    nights: 2,
    guests: 2,
    guest_name: 'E2E Guest',
    first_name: 'E2E',
    last_name: 'Guest',
    email: 'guest@example.test',
    phone: '+254712345678',
    country: 'Kenya',
    notes: '',
    language: 'en',
    currency: 'KES',
    accommodation_total: 36000,
    meal_total: 4800,
    discount_total: 0,
    tax_total: 0,
    total: 40800,
    cancellation_cutoff_hours: 48,
    free_cancellation_until: isoFromNow(5),
    hold_expires_at: isoFromNow(1),
    can_cancel: status !== 'cancelled',
    created_at: new Date().toISOString(),
    latest_payment: paymentSummaryFixture(paymentStatus),
    status_events: [],
  };
}

function quoteFixture(body: Record<string, unknown>) {
  const checkin = String(body.checkin ?? dateFromNow(7));
  const checkout = String(body.checkout ?? dateFromNow(9));
  const guests = Number(body.guests ?? 2);
  return {
    room_type: String(body.room_type ?? 'superior'),
    room_type_name: 'Superior Room',
    rate_plan: 'flexible',
    meal_plan: String(body.meal_plan ?? 'breakfast'),
    checkin,
    checkout,
    guests,
    nights: 2,
    currency: 'KES',
    nightly_rates: [
      { date: checkin, rate: 18000, rate_name: 'Flexible' },
      { date: checkout, rate: 18000, rate_name: 'Flexible' },
    ],
    accommodation_total: 36000,
    meal_total: 2400 * guests,
    discount_percent: 0,
    discount_total: 0,
    tax_total: 0,
    tax_included: true,
    tax_rate_percent: 0,
    total: 36000 + 2400 * guests,
    cancellation_cutoff_hours: 48,
    free_cancellation_until: isoFromNow(5),
    available_rooms: 4,
  };
}

function userFixture(role: StaffRole) {
  const capabilities: Record<string, boolean> = {
    view_guest_data: role === 'front_desk' || role === 'director',
    export_guest_data: role === 'director',
    manage_bookings: role === 'front_desk' || role === 'director',
    manage_content: role === 'director' || role === 'marketing',
    manage_system: role === 'director',
  };
  const roleDisplay =
    role === 'front_desk' ? 'Front desk' : role === 'director' ? 'Director' : 'Marketing';
  return {
    id: 1,
    username: role,
    email: `${role}@hotel.test`,
    first_name: 'Asha',
    last_name: 'Mwangi',
    role,
    role_display: roleDisplay,
    phone: '',
    is_staff: true,
    capabilities,
  };
}

function queueFixture(newBookingCount: number) {
  return {
    generated_at: new Date().toISOString(),
    target_minutes: 10,
    escalate_minutes: 8,
    undo_seconds: 120,
    new_booking_count: newBookingCount,
    new_booking_window_minutes: 10,
    items: [
      {
        entity_type: 'room_booking',
        id: 101,
        reference: TEST_BOOKING_REFERENCE,
        guest_name: 'Asha Njoroge',
        phone: '+254712345678',
        summary: 'Two-night stay awaiting confirmation',
        amount: 40800,
        status: 'pending_confirmation',
        payment_status: 'succeeded',
        created_at: isoFromNow(-0.02),
        deadline_at: isoFromNow(0.1),
        seconds_remaining: 600,
        overdue: false,
        actions: ['confirm', 'decline'],
      },
    ],
  };
}

function deskActionFixture(body: Record<string, unknown>) {
  const action = String(body.action ?? 'confirm');
  return {
    id: 501,
    entity_type: String(body.entity_type ?? 'room_booking'),
    entity_id: Number(body.entity_id ?? 101),
    action,
    previous_status: 'pending_confirmation',
    new_status: action === 'confirm' ? 'confirmed' : 'declined',
    actor_name: 'Asha Mwangi',
    undo_deadline: isoFromNow(0.05),
    undone_at: null,
    created_at: new Date().toISOString(),
  };
}

function errorEnvelope(code: string, message: string, status: number) {
  return {
    error: {
      code,
      message,
      fields: null,
      request_id: null,
      status,
    },
  };
}

/** Install a catch-all mock for the frontend's `/api/v1` traffic. */
export async function installApiMocks(
  page: Page,
  options: ApiMockOptions = {},
): Promise<ApiMocks> {
  const calls: ApiCall[] = [];
  const state = {
    authenticated: options.authenticated ?? false,
    role: options.role ?? 'front_desk',
    sandboxCompleted: false,
    sandboxFailed: false,
    cancelled: false,
    paymentProvider: 'mpesa' as string,
    rooms: [
      {
        id: 1,
        number: '201',
        room_type: 'superior',
        room_type_name: 'Superior Room',
        status: 'free',
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        number: '203',
        room_type: 'en-suite',
        room_type_name: 'En-suite Room',
        status: 'occupied',
        updated_at: new Date().toISOString(),
      },
    ] as Array<Record<string, unknown>>,
  };

  // External media and fonts must never decide whether a test's `load` event
  // fires. Serve a deterministic empty stylesheet / 1px image instead.
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://images.unsplash.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    }),
  );
  await page.route('https://plausible.io/**', (route) => route.abort());
  await page.route('https://www.google.com/maps/**', (route) => route.abort());

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = apiPath(request);
    const method = request.method();
    const body = readBody(request);
    calls.push({ method, path, body });

    if (path === '/auth/csrf/') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === 'GET' && path === '/common/hotel/') {
      await json(route, 200, {
        name: 'West Premier Hotel',
        short_name: 'West Premier',
        legal_name: 'West Premier Hotel Limited',
        phone_display: '+254 700 000 000',
        phone_href: 'tel:+254700000000',
        email: 'stay@westpremierhotel.co.ke',
        address_line: 'E2E test address',
        town: 'Nairobi',
        county: 'Nairobi County',
        country: 'Kenya',
      });
      return;
    }

    if (method === 'GET' && path === '/rooms/') {
      await json(route, 200, [
        {
          slug: 'superior',
          name: 'Superior Room',
          description: 'A calm, comfortable room.',
          price: 18000,
          sleeps: 2,
          size: 28,
          image: '',
          amenities: [],
        },
      ]);
      return;
    }

    if (method === 'GET' && path === '/meal-plans/') {
      await json(route, 200, [
        { id: 'room-only', name: 'Room only', supplement: 0 },
        { id: 'breakfast', name: 'Breakfast', supplement: 1200 },
      ]);
      return;
    }

    if (method === 'GET' && path === '/bookings/availability/') {
      const soldOut = options.soldOutRoomTypes ?? [];
      await json(route, 200, [
        {
          room_type: 'superior',
          name: 'Superior Room',
          available_rooms: soldOut.includes('superior') ? 0 : 4,
          sleeps: 2,
          fits_guests: true,
          from_price: 18000,
        },
        {
          room_type: 'deluxe',
          name: 'Deluxe Room',
          available_rooms: soldOut.includes('deluxe') ? 0 : 3,
          sleeps: 3,
          fits_guests: true,
          from_price: 26000,
        },
        {
          room_type: 'en-suite',
          name: 'En-suite Room',
          available_rooms: soldOut.includes('en-suite') ? 0 : 2,
          sleeps: 4,
          fits_guests: true,
          from_price: 38000,
        },
      ]);
      return;
    }

    if (method === 'POST' && path === '/bookings/quote/') {
      await json(route, 200, quoteFixture((body ?? {}) as Record<string, unknown>));
      return;
    }

    if (method === 'POST' && path === '/bookings/') {
      await json(route, 201, {
        booking: bookingFixture(options.bookingStatus ?? 'held', 'pending'),
      });
      return;
    }

    const lookupMatch = path.match(/^\/bookings\/([^/]+)\/$/);
    if (method === 'GET' && lookupMatch) {
      if (options.bookingNotFound) {
        await json(route, 404, errorEnvelope('not_found', 'Booking not found', 404));
        return;
      }
      await json(
        route,
        200,
        bookingFixture(
          state.cancelled ? 'cancelled' : (options.bookingStatus ?? 'confirmed'),
          'succeeded',
        ),
      );
      return;
    }

    const cancelMatch = path.match(/^\/bookings\/([^/]+)\/cancel\/$/);
    if (method === 'POST' && cancelMatch) {
      state.cancelled = true;
      await json(route, 200, bookingFixture('cancelled', 'succeeded'));
      return;
    }

    if (method === 'GET' && path === '/payments/methods/') {
      await json(route, 200, {
        methods: [
          { code: 'mpesa', label: 'M-Pesa', enabled: true },
          { code: 'card', label: 'Card', enabled: true },
          { code: 'bank_transfer', label: 'Bank transfer', enabled: true },
        ],
        bank: {
          bank_name: 'E2E Bank',
          account_name: 'West Premier Hotel',
          account_number: '0000000001',
          branch: 'Nairobi',
          swift: 'E2EBKE00',
        },
        sandbox: true,
      });
      return;
    }

    const initiateMatch = path.match(/^\/payments\/bookings\/([^/]+)\/$/);
    if (method === 'POST' && initiateMatch) {
      const provider = String((body as Record<string, unknown> | undefined)?.method ?? 'mpesa');
      state.paymentProvider = provider;
      await json(route, 201, {
        payment: paymentFixture(provider, 'pending'),
        message: 'Payment initiated in the E2E sandbox.',
        sandbox: true,
      });
      return;
    }

    const sandboxMatch = path.match(/^\/payments\/([^/]+)\/sandbox-complete\/$/);
    if (method === 'POST' && sandboxMatch) {
      const success = (body as Record<string, unknown> | undefined)?.success !== false;
      state.sandboxCompleted = true;
      state.sandboxFailed = !success;
      await json(
        route,
        200,
        paymentFixture(state.paymentProvider, success ? 'succeeded' : 'failed'),
      );
      return;
    }

    const paymentMatch = path.match(/^\/payments\/([^/]+)\/$/);
    if (method === 'GET' && paymentMatch) {
      const status: PaymentStatus =
        options.paymentStatus ??
        (state.sandboxFailed ? 'failed' : state.sandboxCompleted ? 'succeeded' : 'pending');
      await json(route, 200, paymentFixture(state.paymentProvider, status));
      return;
    }

    if (method === 'POST' && path === '/staff/auth/login/') {
      const username = String((body as Record<string, unknown> | undefined)?.username ?? '').trim();
      const role: StaffRole =
        username === 'director' ? 'director' : username === 'marketing' ? 'marketing' : 'front_desk';
      state.authenticated = true;
      state.role = role;
      await json(route, 200, { user: userFixture(role) });
      return;
    }

    if (method === 'GET' && path === '/staff/auth/me/') {
      if (!state.authenticated) {
        await json(route, 401, errorEnvelope('authentication_required', 'Sign in required', 401));
        return;
      }
      await json(route, 200, { user: userFixture(state.role) });
      return;
    }

    if (method === 'POST' && path === '/staff/auth/logout/') {
      state.authenticated = false;
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === 'GET' && path === '/staff/rooms/') {
      await json(route, 200, state.rooms);
      return;
    }

    if (method === 'PATCH') {
      const statusMatch = path.match(/^\/staff\/rooms\/(\d+)\/status\/$/);
      if (statusMatch) {
        const id = Number(statusMatch[1]);
        state.rooms = state.rooms.map((room) =>
          room.id === id
            ? { ...room, status: (body as Record<string, unknown>).status }
            : room,
        );
        await json(route, 200, state.rooms.find((room) => room.id === id));
        return;
      }
    }

    if (method === 'GET' && path === '/staff/frontdesk/queue/') {
      await json(route, 200, queueFixture(options.newBookingCount ?? 0));
      return;
    }

    if (method === 'POST' && path === '/staff/frontdesk/actions/') {
      await json(route, 200, deskActionFixture((body ?? {}) as Record<string, unknown>));
      return;
    }

    if (method === 'GET' && path === '/staff/frontdesk/activity/') {
      await json(route, 200, {
        results: [
          {
            id: 1,
            entity_type: 'room_booking',
            entity_id: 101,
            action: 'confirm',
            previous_status: 'pending_confirmation',
            new_status: 'confirmed',
            actor: 'Asha Mwangi',
            created_at: new Date().toISOString(),
            undone_at: null,
          },
        ],
      });
      return;
    }

    if (method === 'POST' && path === '/staff/frontdesk/escalate/') {
      await json(route, 200, { escalated: 1, notified: ['e2e@example.test'] });
      return;
    }

    if (method === 'GET' && path === '/staff/reports/overview/') {
      await json(route, 200, {
        date: dateFromNow(0),
        arrivals: 2,
        departures: 1,
        in_house_guests: 4,
        in_house_bookings: 2,
        total_rooms: 20,
        occupancy_percent: 25,
        revenue_today: 56000,
        pending: {
          room_bookings: 1,
          table_bookings: 0,
          conference_enquiries: 0,
          gym_day_passes: 0,
        },
      });
      return;
    }

    if (method === 'GET' && path === '/staff/reports/occupancy/') {
      await json(route, 200, {
        results: [
          {
            date: dateFromNow(0),
            occupancy_percent: 25,
            in_house_bookings: 2,
            revenue_today: 56000,
          },
        ],
      });
      return;
    }

    if (method === 'GET' && path === '/staff/reports/payments/') {
      await json(route, 200, {
        results: [
          {
            reference: TEST_PAYMENT_REFERENCE,
            booking_reference: TEST_BOOKING_REFERENCE,
            gym_pass_reference: '',
            purpose: 'room_booking',
            purpose_display: 'Room booking',
            provider: 'mpesa',
            provider_display: 'M-Pesa',
            status: 'succeeded',
            status_display: 'Payment received',
            amount: 40800,
            currency: 'KES',
            phone: '+254712345678',
            provider_reference: '',
            requires_review: false,
            created_at: new Date().toISOString(),
            paid_at: new Date().toISOString(),
          },
        ],
        count: 1,
        total_amount: 40800,
      });
      return;
    }

    // Policy drafts are hidden from guests by the real API. Returning 404 here
    // keeps the E2E policy pages on their prerendered fallback copy.
    if (method === 'GET' && path.startsWith('/content/policies/')) {
      await json(route, 404, errorEnvelope('not_found', 'Policy not found', 404));
      return;
    }

    // Marketing pages only need non-error payloads for their content queries.
    if (method === 'GET') {
      await json(route, 200, []);
      return;
    }
    await json(route, 201, {});
  });

  return { calls };
}
