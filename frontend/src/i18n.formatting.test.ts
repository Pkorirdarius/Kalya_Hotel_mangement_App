import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, setLanguage } from './i18n';

describe('localized formatting', () => {
  it('formats dates with the English locale', () => {
    setLanguage('en', false);
    expect(formatDate('2026-01-15')).toBe('Thu, 15 Jan 2026');
  });

  it('formats dates with the Kiswahili locale', () => {
    setLanguage('sw', false);
    expect(formatDate('2026-01-15')).toBe('Alhamisi, 15 Jan 2026');
    setLanguage('en', false);
  });

  it('uses the active language for number formatting', () => {
    const original = Intl.NumberFormat;
    const locales: string[] = [];
    const RecordingNumberFormat = function (
      locale: string,
      options?: Intl.NumberFormatOptions,
    ) {
      locales.push(locale);
      return new original(locale, options);
    } as unknown as typeof Intl.NumberFormat;

    Intl.NumberFormat = RecordingNumberFormat;
    try {
      setLanguage('sw', false);
      expect(formatMoney(25500)).toBe('25,500');

      setLanguage('en', false);
      expect(formatMoney(25500)).toBe('25,500');
    } finally {
      Intl.NumberFormat = original;
    }

    expect(locales).toEqual(['sw-KE', 'en-KE']);
  });
});
