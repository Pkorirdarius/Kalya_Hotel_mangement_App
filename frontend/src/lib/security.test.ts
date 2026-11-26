import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

interface VercelConfig {
  headers?: Array<{
    source: string;
    headers: Array<{ key: string; value: string }>;
  }>;
  rewrites: Array<{ source: string; destination: string }>;
}

const config = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8'),
) as VercelConfig;

describe('frontend deployment security headers', () => {
  it('ships a report-only CSP for every route', () => {
    const rule = config.headers?.find((entry) => entry.source === '/(.*)');
    const csp = rule?.headers.find(
      (header) => header.key === 'Content-Security-Policy-Report-Only',
    );

    expect(csp?.value).toContain("default-src 'self'");
    expect(csp?.value).toContain("frame-ancestors 'none'");
    expect(csp?.value).toContain('https://plausible.io');
    expect(csp?.value).toContain('https://www.google.com');
    expect(rule?.headers.some((header) => header.key === 'Content-Security-Policy')).toBe(
      false,
    );
  });

  it('keeps the SPA rewrite fallback', () => {
    expect(config.rewrites).toEqual([
      { source: '/(.*)', destination: '/index.html' },
    ]);
  });
});
