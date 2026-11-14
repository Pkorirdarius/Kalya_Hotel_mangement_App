/** Typed query keys. Centralised so invalidation cannot drift from fetching. */

export interface Contact {
  email?: string;
  phone?: string;
}

export interface AvailabilityParams {
  checkin: string;
  checkout: string;
  guests?: number;
}

export const queryKeys = {
  hotel: ['hotel'] as const,
  rooms: ['rooms'] as const,
  room: (slug: string) => ['rooms', slug] as const,
  mealPlans: ['meal-plans'] as const,
  offers: ['offers'] as const,
  posts: ['posts'] as const,
  post: (slug: string) => ['posts', slug] as const,
  reviews: ['reviews'] as const,
  menu: (params?: { venue?: string; category?: string }) => ['menu', params ?? {}] as const,
  availability: (params: AvailabilityParams) => ['availability', params] as const,
  booking: (reference: string, contact: Contact) => ['booking', reference, contact] as const,
  restaurantSlots: (date: string) => ['restaurant-slots', date] as const,
  conferenceAvailability: (params?: { date?: string; session?: string }) =>
    ['conference-availability', params ?? {}] as const,
  gymAvailability: (date?: string) => ['gym-availability', date ?? 'today'] as const,
  paymentMethods: ['payment-methods'] as const,
  payment: (reference: string) => ['payment', reference] as const,
  staffMe: ['staff', 'me'] as const,
  frontDeskQueue: ['frontdesk', 'queue'] as const,
  frontDeskActivity: (limit: number) => ['frontdesk', 'activity', limit] as const,
  staffOverview: (date: string) => ['staff', 'reports', 'overview', date] as const,
  occupancyReport: (start: string, end: string) =>
    ['staff', 'reports', 'occupancy', start, end] as const,
  paymentReport: (start: string, end: string) =>
    ['staff', 'reports', 'payments', start, end] as const,
} as const;
