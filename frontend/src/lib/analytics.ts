/**
 * Privacy-friendly, opt-in analytics.
 *
 * Nothing loads unless `VITE_ANALYTICS_DOMAIN` is set at build time. The
 * default integration is Plausible, which does not use cookies or collect
 * personal data. Self-hosted or other providers can call `trackEvent` from
 * their own snippet instead.
 */

type AnalyticsProps = Record<string, string | number | boolean>;

type PlausibleFn = (
  event: string,
  options?: { props?: AnalyticsProps; u?: string },
) => void;

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

const SCRIPT_MARKER = 'data-hotel-analytics';

export function initAnalytics(): void {
  const domain = import.meta.env.VITE_ANALYTICS_DOMAIN as string | undefined;
  if (!domain || typeof document === 'undefined') return;
  if (document.querySelector(`script[${SCRIPT_MARKER}]`)) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://plausible.io/js/script.js';
  script.setAttribute('data-domain', domain);
  script.setAttribute(SCRIPT_MARKER, 'true');
  document.head.appendChild(script);
}

export function trackPageview(path: string): void {
  if (typeof window === 'undefined' || !window.plausible) return;
  window.plausible('pageview', { u: `${window.location.origin}${path}` });
}

export function trackEvent(name: string, props?: AnalyticsProps): void {
  if (typeof window === 'undefined' || !window.plausible) return;
  window.plausible(name, props ? { props } : undefined);
}
