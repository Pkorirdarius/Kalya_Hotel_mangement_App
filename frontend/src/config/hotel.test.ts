import { describe, expect, it } from 'vitest';

import { hotelFromEnv } from './hotel';

describe('hotelFromEnv', () => {
  it('uses documented defaults when no brand variables are set', () => {
    const hotel = hotelFromEnv({});

    expect(hotel.name).not.toBe('');
    expect(hotel.location.town).not.toBe('');
    expect(hotel.contact.email).toContain('@');
    expect(hotel.facilities.hallNames).toHaveLength(3);
    expect(hotel.socials.map((social) => social.id)).toEqual([
      'facebook',
      'instagram',
      'x',
      'linkedin',
    ]);
  });

  it('overrides public values from the environment', () => {
    const hotel = hotelFromEnv({
      VITE_HOTEL_NAME: 'Env Hotel',
      VITE_HOTEL_TOWN: 'Test Town',
      VITE_HOTEL_EMAIL: 'stay@example.com',
      VITE_HOTEL_GYM_NAME: 'Env Fitness',
      VITE_HOTEL_FACEBOOK_URL: 'https://example.com/hotel',
    });

    expect(hotel.name).toBe('Env Hotel');
    expect(hotel.location.town).toBe('Test Town');
    expect(hotel.contact.email).toBe('stay@example.com');
    expect(hotel.facilities.gymName).toBe('Env Fitness');
    expect(hotel.socials.find((social) => social.id === 'facebook')?.href).toBe(
      'https://example.com/hotel',
    );
  });

  it('removes social links whose variable is explicitly empty', () => {
    const hotel = hotelFromEnv({ VITE_HOTEL_X_URL: '' });

    expect(hotel.socials.map((social) => social.id)).not.toContain('x');
  });

  it('reads pipe-separated hall names and keeps the primary hall in sync', () => {
    const hotel = hotelFromEnv({
      VITE_HOTEL_HALL_NAMES: 'Alpha Hall | Beta Hall',
    });

    expect(hotel.facilities.hallNames).toEqual(['Alpha Hall', 'Beta Hall']);
    expect(hotel.facilities.hallName).toBe('Alpha Hall');
  });
});
