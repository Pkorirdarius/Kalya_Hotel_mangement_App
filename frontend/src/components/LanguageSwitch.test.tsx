import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { LanguageSwitch } from './LanguageSwitch';
import { I18nProvider } from '../i18n-context';
import { setLanguage } from '../i18n';

function LocationProbe() {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="location">{`${pathname}${search}${hash}`}</output>;
}

afterEach(() => {
  setLanguage('en', false);
});

describe('LanguageSwitch', () => {
  it('switches paths and preserves query strings and hashes', async () => {
    setLanguage('sw', false);
    render(
      <MemoryRouter initialEntries={['/sw/rooms?ref=partner#gallery']}>
        <I18nProvider>
          <LocationProbe />
          <LanguageSwitch />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/sw/rooms?ref=partner#gallery');

    await userEvent.click(document.querySelector<HTMLButtonElement>('[data-language-switch]')!);

    expect(screen.getByTestId('location')).toHaveTextContent('/rooms?ref=partner#gallery');
  });

  it('switches from English to the /sw tree', async () => {
    render(
      <MemoryRouter initialEntries={['/rooms?x=1']}>
        <I18nProvider>
          <LocationProbe />
          <LanguageSwitch />
        </I18nProvider>
      </MemoryRouter>,
    );

    await userEvent.click(document.querySelector<HTMLButtonElement>('[data-language-switch]')!);

    expect(screen.getByTestId('location')).toHaveTextContent('/sw/rooms?x=1');
  });
});
