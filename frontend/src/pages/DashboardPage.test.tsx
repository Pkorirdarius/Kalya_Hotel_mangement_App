import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../components/ToastProvider';
import { I18nProvider } from '../i18n-context';
import { createQueryClient } from '../lib/query/queryClient';
import { DashboardPage } from './DashboardPage';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function staffBody() {
  return {
    user: {
      id: 3,
      username: 'frontdesk',
      email: 'frontdesk@example.com',
      first_name: 'Amina',
      last_name: 'Kip',
      role: 'front_desk',
      role_display: 'Front desk',
      phone: '',
      is_staff: true,
      capabilities: {
        view_guest_data: true,
        export_guest_data: false,
        manage_bookings: true,
        manage_content: false,
        manage_system: false,
      },
    },
  };
}

function queueItem(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    entity_type: 'booking',
    id: 41,
    reference: 'WP-2026-0041',
    guest_name: 'Amina Wanjiku',
    phone: '254712345678',
    summary: 'Standard · 01 Dec → 03 Dec · 2 guests · 2 nights',
    amount: 19400,
    status: 'pending_payment',
    payment_status: 'unpaid',
    created_at: new Date(now - 120_000).toISOString(),
    deadline_at: new Date(now + 480_000).toISOString(),
    seconds_remaining: 480,
    overdue: false,
    actions: ['confirm', 'decline'],
    ...overrides,
  };
}

function actionBody(
  item: Record<string, unknown>,
  action: 'confirm' | 'decline' | 'undo',
) {
  return {
    id: action === 'undo' ? 2 : 1,
    entity_type: item.entity_type,
    entity_id: item.id,
    action,
    previous_status: action === 'undo' ? 'confirmed' : item.status,
    new_status:
      action === 'undo'
        ? item.status
        : action === 'confirm'
          ? 'confirmed'
          : 'declined',
    actor_name: 'Amina Kip',
    undo_deadline:
      action === 'undo' ? null : new Date(Date.now() + 10_000).toISOString(),
    undone_at: null,
    created_at: new Date().toISOString(),
  };
}

function mockFetch(options: { authenticated?: boolean } = {}) {
  let authenticated = options.authenticated ?? false;
  let queue: Array<Record<string, unknown>> = [
    queueItem(),
    queueItem({
      entity_type: 'table_booking',
      id: 7,
      reference: 'TB-2026-0007',
      guest_name: 'Grace Wanjiku',
      summary: 'Restaurant · 15 Nov · 19:00 · 2 guests',
      amount: null,
      status: 'pending',
      payment_status: '',
      created_at: new Date(Date.now() - 12 * 60_000).toISOString(),
      deadline_at: new Date(Date.now() - 2 * 60_000).toISOString(),
      seconds_remaining: -120,
      overdue: true,
    }),
  ];
  const handled: Array<Record<string, unknown>> = [];

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.includes('/auth/csrf/')) return jsonResponse(200, {});
    if (url.includes('/staff/auth/me/')) {
      return authenticated
        ? jsonResponse(200, staffBody())
        : jsonResponse(403, {
            error: {
              code: 'permission_denied',
              message: 'You do not have permission to perform this action.',
              fields: null,
              request_id: null,
            },
          });
    }
    if (url.includes('/staff/auth/login/') && method === 'POST') {
      authenticated = true;
      return jsonResponse(200, staffBody());
    }
    if (url.includes('/staff/auth/logout/') && method === 'POST') {
      authenticated = false;
      return jsonResponse(204, null);
    }
    if (url.includes('/staff/frontdesk/queue/') && method === 'GET') {
      return jsonResponse(200, {
        generated_at: new Date().toISOString(),
        target_minutes: 10,
        escalate_minutes: 8,
        undo_seconds: 10,
        items: queue,
      });
    }
    if (url.includes('/staff/frontdesk/activity/') && method === 'GET') {
      return jsonResponse(200, {
        results: [
          {
            id: 12,
            entity_type: 'table_booking',
            entity_id: 6,
            action: 'confirm',
            previous_status: 'pending',
            new_status: 'confirmed',
            actor: 'Amina Kip',
            created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
            undone_at: null,
          },
        ],
      });
    }
    if (url.includes('/staff/frontdesk/actions/') && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as {
        entity_type: string;
        entity_id: number;
        action: 'confirm' | 'decline' | 'undo';
      };
      if (body.action === 'undo') {
        const index = handled.findIndex(
          (item) => item.entity_type === body.entity_type && item.id === body.entity_id,
        );
        const item = index >= 0 ? handled.splice(index, 1)[0] : queueItem();
        queue = [item, ...queue];
        return jsonResponse(201, actionBody(item, 'undo'));
      }
      const index = queue.findIndex(
        (item) => item.entity_type === body.entity_type && item.id === body.entity_id,
      );
      const item = index >= 0 ? queue.splice(index, 1)[0] : queueItem();
      handled.push(item);
      return jsonResponse(201, actionBody(item, body.action));
    }
    if (url.includes('/staff/frontdesk/escalate/') && method === 'POST') {
      return jsonResponse(200, { escalated: 1 });
    }

    return jsonResponse(404, { detail: `Unhandled ${method} ${url}` });
  });
}

function renderDashboard() {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: false },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <DashboardPage />
          </MemoryRouter>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DashboardPage', () => {
  it('gates the queue behind a staff login and loads it after signing in', async () => {
    const fetchMock = mockFetch({ authenticated: false });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDashboard();

    expect(
      await screen.findByRole('heading', { name: 'Staff sign in' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('WP-2026-0041')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Username or email'), 'frontdesk');
    await user.type(screen.getByLabelText('Password'), 'strong-test-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('WP-2026-0041')).toBeInTheDocument();
    expect(screen.getByText('Amina Wanjiku')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Needs a decision' })).toBeInTheDocument();

    const loginCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).includes('/staff/auth/login/') && init?.method === 'POST',
    );
    expect(loginCall).toBeTruthy();
    expect(JSON.parse(String(loginCall?.[1]?.body))).toEqual({
      username: 'frontdesk',
      password: 'strong-test-password',
    });
  });

  it('confirms an item and undoes the action inside the window', async () => {
    vi.stubGlobal('fetch', mockFetch({ authenticated: true }));
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByText('WP-2026-0041')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Confirm Amina Wanjiku' }),
    );

    await waitFor(() => {
      expect(screen.getAllByText('Marked as confirmed.').length).toBeGreaterThan(0);
    });
    // The undo banner intentionally still shows the reference; the queue card
    // is what disappears after a successful action.
    expect(
      screen.queryByRole('button', { name: 'Confirm Amina Wanjiku' }),
    ).not.toBeInTheDocument();

    const undoButton = await screen.findByRole('button', { name: /Undo/ });
    await user.click(undoButton);

    expect(
      await screen.findByText('Action undone. The item is back in the queue.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('WP-2026-0041')).toBeInTheDocument();
  });

  it('escalates overdue items and signs out', async () => {
    const fetchMock = mockFetch({ authenticated: true });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByText('WP-2026-0041')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Escalate overdue' }));
    expect(await screen.findByText('Escalated 1 item(s).')).toBeInTheDocument();

    const escalateCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).includes('/staff/frontdesk/escalate/') && init?.method === 'POST',
    );
    expect(escalateCall).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(
      await screen.findByRole('heading', { name: 'Staff sign in' }),
    ).toBeInTheDocument();

    const logoutCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).includes('/staff/auth/logout/') && init?.method === 'POST',
    );
    expect(logoutCall).toBeTruthy();
  });
});
