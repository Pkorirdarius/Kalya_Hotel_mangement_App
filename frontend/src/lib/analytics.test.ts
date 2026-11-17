import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initAnalytics, trackEvent, trackPageview } from './analytics';

type Queued = Array<[string, { props?: Record<string, unknown>; u?: string }?]>;

function queue() {
  return (window.plausible as unknown as { q?: Queued }).q;
}

describe('analytics', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete window.plausible;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.plausible;
  });

  it('does nothing until an analytics domain is configured', () => {
    vi.stubEnv('VITE_ANALYTICS_DOMAIN', '');
    initAnalytics();

    expect(document.querySelector('script[data-hotel-analytics]')).toBeNull();
    expect(window.plausible).toBeUndefined();
  });

  it('loads the manual script once and queues early pageviews', () => {
    vi.stubEnv('VITE_ANALYTICS_DOMAIN', 'hotel.example');
    initAnalytics();
    initAnalytics();

    const scripts = document.querySelectorAll('script[data-hotel-analytics]');
    expect(scripts).toHaveLength(1);
    expect(scripts[0].getAttribute('src')).toBe(
      'https://plausible.io/js/script.manual.js',
    );
    expect(scripts[0].getAttribute('data-domain')).toBe('hotel.example');

    trackPageview('/rooms');
    trackEvent('booking_started', { room: 'standard-executive' });

    expect(queue()).toEqual([
      ['pageview', { u: `${window.location.origin}/rooms` }],
      ['booking_started', { props: { room: 'standard-executive' } }],
    ]);
  });
});
