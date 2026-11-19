import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { Link } from './LocalizedLink';
import { I18nProvider } from '../i18n-context';
import { setLanguage } from '../i18n';

function renderLink(to: string, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>
        <Link to={to}>Rooms</Link>
      </I18nProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  setLanguage('en', false);
});

describe('LocalizedLink', () => {
  it('uses unprefixed URLs in English', () => {
    renderLink('/rooms?x=1#top');
    expect(screen.getByRole('link', { name: 'Rooms' })).toHaveAttribute(
      'href',
      '/rooms?x=1#top',
    );
  });

  it('adds the Kiswahili prefix while keeping query strings and hashes', () => {
    setLanguage('sw', false);
    renderLink('/rooms?x=1#top', '/sw/rooms');
    expect(screen.getByRole('link', { name: 'Rooms' })).toHaveAttribute(
      'href',
      '/sw/rooms?x=1#top',
    );
  });

  it('does not duplicate an existing Kiswahili prefix', () => {
    setLanguage('sw', false);
    renderLink('/sw/rooms', '/sw/rooms');
    expect(screen.getByRole('link', { name: 'Rooms' })).toHaveAttribute('href', '/sw/rooms');
  });
});
