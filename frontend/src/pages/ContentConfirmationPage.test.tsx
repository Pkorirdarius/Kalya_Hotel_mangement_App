import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../i18n-context';
import { createQueryClient } from '../lib/query/queryClient';
import { ContentConfirmationPage } from './ContentConfirmationPage';

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
      id: 4,
      username: 'marketing',
      email: 'marketing@example.com',
      first_name: 'Mary',
      last_name: 'Wekesa',
      role: 'marketing',
      role_display: 'Marketing',
      phone: '',
      is_staff: true,
      capabilities: {
        view_guest_data: false,
        export_guest_data: false,
        manage_bookings: false,
        manage_content: true,
        manage_system: false,
      },
    },
  };
}

const summary = {
  total: 2,
  counts: {
    'blog-post': 1,
    offer: 1,
    'policy-page': 0,
    review: 0,
    'room-type': 0,
    'menu-item': 0,
  },
  items: [
    {
      kind: 'blog-post',
      model: 'content.BlogPost',
      id: '12',
      label: 'Kapenguria guide',
      active: true,
      needs_confirmation: true,
      updated_at: '2026-11-20T09:00:00Z',
    },
    {
      kind: 'offer',
      model: 'content.Offer',
      id: '5',
      label: 'Weekend deal',
      active: false,
      needs_confirmation: true,
      updated_at: '2026-11-18T09:00:00Z',
    },
  ],
};

function renderPage() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/content-review']}>
          <ContentConfirmationPage />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ContentConfirmationPage', () => {
  it('lists flagged content for a signed-in staff user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/staff/auth/me/')) return jsonResponse(200, staffBody());
        if (url.includes('/staff/common/content-confirmation/')) {
          return jsonResponse(200, summary);
        }
        return jsonResponse(404, { detail: `Unhandled ${url}` });
      }),
    );

    renderPage();

    expect(await screen.findByText('Kapenguria guide')).toBeInTheDocument();
    expect(screen.getByText('Weekend deal')).toBeInTheDocument();
    expect(screen.getByText('2 items flagged')).toBeInTheDocument();
    expect(screen.queryByText('Hidden')).toBeInTheDocument();
  });

  it('asks visitors to sign in first', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(401, { detail: 'Authentication required' })),
    );

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Staff sign-in required' }),
    ).toBeInTheDocument();
  });
});
