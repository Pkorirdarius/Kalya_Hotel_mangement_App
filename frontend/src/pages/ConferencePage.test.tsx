import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../components/ToastProvider';
import { I18nProvider } from '../i18n-context';
import { createQueryClient } from '../lib/query/queryClient';
import { addDaysISO, todayISO } from '../utils';
import { ConferencePage } from './ConferencePage';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function dayLabel(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date);
  return { weekday, day: date.getDate() };
}

function enquiryBody(request: Record<string, unknown>) {
  return {
    reference: 'CE-7788',
    date: request.date,
    session: request.session,
    session_display: 'Half day',
    people: request.people,
    layout: request.layout,
    layout_display: 'Boardroom',
    catering: request.catering,
    guest_name: `${String(request.first_name)} ${String(request.last_name)}`,
    first_name: request.first_name,
    last_name: request.last_name,
    company: request.company,
    email: request.email,
    phone: request.phone,
    notes: request.notes,
    status: 'pending',
    status_display: 'Pending',
    created_at: '2026-11-12T09:00:00Z',
  };
}

function renderConferencePage() {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: false },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/conference']}>
            <ConferencePage />
          </MemoryRouter>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

function mockFetch(options: {
  rows?: Array<{ date: string; session: string; status: string; label: string }>;
  createStatus?: number;
  createBody?: unknown;
} = {}) {
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/auth/csrf/')) return jsonResponse(200, {});
    if (url.includes('/facilities/conference/availability/') && method === 'GET') {
      return jsonResponse(
        200,
        options.rows ?? [
          { date: today, session: 'breakfast', status: 'full', label: 'Full' },
          { date: tomorrow, session: 'breakfast', status: 'available', label: 'Available' },
        ],
      );
    }
    if (url.includes('/facilities/conference/enquiries/') && method === 'POST') {
      if (options.createStatus && options.createStatus !== 201) {
        return jsonResponse(options.createStatus, options.createBody);
      }
      return jsonResponse(201, {
        enquiry: enquiryBody(JSON.parse(String(init?.body)) as Record<string, unknown>),
      });
    }
    return jsonResponse(404, { detail: `Unhandled ${method} ${url}` });
  });
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Contact name'), 'Amina Otieno');
  await user.type(screen.getByLabelText('Email'), 'amina@example.com');
  await user.type(screen.getByLabelText('Phone'), '0712 345 678');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ConferencePage', () => {
  it('shows live availability and submits the enquiry with the chosen details', async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const tomorrow = addDaysISO(todayISO(), 1);
    const label = dayLabel(tomorrow);
    renderConferencePage();

    expect(
      await screen.findByRole('button', {
        name: `${label.weekday} ${label.day} — Available`,
      }),
    ).toBeEnabled();

    await fillValidForm(user);
    await user.clear(screen.getByLabelText('Guests'));
    await user.type(screen.getByLabelText('Guests'), '24');
    await user.selectOptions(screen.getByLabelText('Session'), 'half_day');
    await user.selectOptions(screen.getByLabelText('Room layout'), 'boardroom');
    await user.click(screen.getByRole('checkbox', { name: 'Tea & coffee break' }));
    await user.click(screen.getByRole('checkbox', { name: 'Working lunch' }));
    await user.click(screen.getByRole('button', { name: 'Request the hall' }));

    expect(await screen.findByText('Your request is in.')).toBeInTheDocument();
    expect(screen.getByText('CE-7788')).toBeInTheDocument();
    expect(screen.getByText(/24 guests/)).toBeInTheDocument();

    const createCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).includes('/facilities/conference/enquiries/') &&
        init?.method === 'POST',
    );
    expect(createCall).toBeTruthy();
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      date: tomorrow,
      session: 'half_day',
      layout: 'boardroom',
      people: 24,
      catering: ['tea', 'lunch'],
      first_name: 'Amina',
      last_name: 'Otieno',
      email: 'amina@example.com',
      phone: '254712345678',
    });
  });

  it('blocks a fully booked date and disables the submit button', async () => {
    const tomorrow = addDaysISO(todayISO(), 1);
    const label = dayLabel(tomorrow);
    const fetchMock = mockFetch({
      rows: [{ date: tomorrow, session: 'breakfast', status: 'full', label: 'Full' }],
    });
    vi.stubGlobal('fetch', fetchMock);
    renderConferencePage();

    expect(
      await screen.findByRole('button', {
        name: `${label.weekday} ${label.day} — Full`,
      }),
    ).toBeDisabled();
    expect(
      screen.getByText('This session is unavailable. Choose another date or session.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request the hall' })).toBeDisabled();

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input).includes('/facilities/conference/enquiries/') &&
            init?.method === 'POST',
        ),
      ).toBe(false);
    });
  });

  it('shows the server message when the date has just been taken', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        createStatus: 400,
        createBody: {
          error: {
            code: 'validation_error',
            message: 'That date is no longer available.',
            fields: { date: ['That date is fully booked.'] },
            request_id: null,
          },
        },
      }),
    );
    const user = userEvent.setup();
    renderConferencePage();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Request the hall' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That date is fully booked.',
    );
  });
});
