import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../components/ToastProvider';
import { I18nProvider } from '../i18n-context';
import { createQueryClient } from '../lib/query/queryClient';
import { DiningPage } from './DiningPage';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function tableBookingBody(request: Record<string, unknown>) {
  return {
    reference: 'TB-4821',
    date: request.date,
    time: `${String(request.time)}:00`,
    party_size: request.party_size,
    guest_name: `${String(request.first_name)} ${String(request.last_name)}`,
    first_name: request.first_name,
    last_name: request.last_name,
    phone: request.phone,
    email: request.email,
    occasion: request.occasion,
    notes: request.notes,
    status: 'pending',
    status_display: 'Pending',
    created_at: '2026-11-12T09:00:00Z',
  };
}

function renderDiningPage() {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: false },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/dining']}>
            <DiningPage />
          </MemoryRouter>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

function mockFetch(options: {
  slots?: Array<{ time: string; remaining: number }>;
  createStatus?: number;
  createBody?: unknown;
} = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/auth/csrf/')) return jsonResponse(200, {});
    if (url.includes('/facilities/restaurant/slots/') && method === 'GET') {
      return jsonResponse(200, options.slots ?? [
        { time: '18:00', remaining: 20 },
        { time: '19:00', remaining: 12 },
        { time: '20:00', remaining: 20 },
        { time: '21:00', remaining: 20 },
      ]);
    }
    if (url.includes('/facilities/restaurant/bookings/') && method === 'POST') {
      if (options.createStatus && options.createStatus !== 201) {
        return jsonResponse(options.createStatus, options.createBody);
      }
      return jsonResponse(201, {
        booking: tableBookingBody(JSON.parse(String(init?.body)) as Record<string, unknown>),
      });
    }
    return jsonResponse(404, { detail: `Unhandled ${method} ${url}` });
  });
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), 'Amina Otieno');
  await user.type(screen.getByLabelText('Phone number'), '0712 345 678');
  await user.click(screen.getByRole('radio', { name: /19:00/ }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DiningPage', () => {
  it('checks live slots and shows the reference returned by the API', async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDiningPage();

    await fillValidForm(user);
    expect(await screen.findByText('12 seats left')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Request table' }));

    expect(await screen.findByText('Your table request is in.')).toBeInTheDocument();
    expect(screen.getByText('TB-4821')).toBeInTheDocument();
    expect(screen.getByText(/19:00/)).toBeInTheDocument();

    const createCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).includes('/facilities/restaurant/bookings/') &&
        init?.method === 'POST',
    );
    expect(createCall).toBeTruthy();
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      time: '19:00',
      party_size: 2,
      first_name: 'Amina',
      last_name: 'Otieno',
      phone: '254712345678',
    });
  });

  it('marks slots that no longer fit the party size as full', async () => {
    vi.stubGlobal('fetch', mockFetch({ slots: [{ time: '19:00', remaining: 1 }] }));
    const user = userEvent.setup();
    renderDiningPage();

    const slot = screen.getByRole('radio', { name: /19:00/ });
    await waitFor(() => expect(slot).toBeDisabled());
    expect(screen.getByText('Full')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Party size'), '1');
    expect(slot).toBeEnabled();
  });

  it('requires a first and last name before submitting', async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDiningPage();

    await user.type(screen.getByLabelText('Full name'), 'Amina');
    await user.type(screen.getByLabelText('Phone number'), '0712345678');
    await user.click(screen.getByRole('button', { name: 'Request table' }));

    expect(await screen.findByText('Enter your first and last name.')).toBeInTheDocument();
    expect(screen.getByText('Please choose a time.')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) =>
          String(input).includes('/facilities/restaurant/bookings/') &&
          init?.method === 'POST',
      ),
    ).toBe(false);
  });

  it('shows the server message when the slot is taken', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        createStatus: 400,
        createBody: {
          error: {
            code: 'validation_error',
            message: 'That time is fully booked.',
            fields: { time: ['This slot is full.'] },
            request_id: null,
          },
        },
      }),
    );
    const user = userEvent.setup();
    renderDiningPage();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Request table' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This slot is full.');
    expect(screen.getAllByText('This slot is full.').length).toBeGreaterThan(0);
  });
});
