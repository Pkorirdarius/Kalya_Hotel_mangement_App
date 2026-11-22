import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

import type { RouteComponentId } from './routes';

export type RouteComponent = ComponentType | LazyExoticComponent<ComponentType>;

export const ROUTE_COMPONENTS: Record<RouteComponentId, RouteComponent> = {
  home: lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage }))),
  rooms: lazy(() => import('../pages/RoomsPage').then((m) => ({ default: m.RoomsPage }))),
  booking: lazy(() => import('../pages/BookingPage').then((m) => ({ default: m.BookingPage }))),
  'manage-booking': lazy(() =>
    import('../pages/BookingManagePage').then((m) => ({ default: m.BookingManagePage })),
  ),
  facilities: lazy(() =>
    import('../pages/FacilitiesPage').then((m) => ({ default: m.FacilitiesPage })),
  ),
  dining: lazy(() => import('../pages/DiningPage').then((m) => ({ default: m.DiningPage }))),
  conference: lazy(() =>
    import('../pages/ConferencePage').then((m) => ({ default: m.ConferencePage })),
  ),
  gym: lazy(() => import('../pages/GymPage').then((m) => ({ default: m.GymPage }))),
  offers: lazy(() => import('../pages/OffersPage').then((m) => ({ default: m.OffersPage }))),
  blog: lazy(() => import('../pages/BlogIndexPage').then((m) => ({ default: m.BlogIndexPage }))),
  'blog-post': lazy(() =>
    import('../pages/BlogPostPage').then((m) => ({ default: m.BlogPostPage })),
  ),
  contact: lazy(() => import('../pages/ContactPage').then((m) => ({ default: m.ContactPage }))),
  privacy: lazy(() =>
    import('../pages/PolicyPage').then((m) => ({
      default: () => <m.PolicyPage slug="privacy" />,
    })),
  ),
  terms: lazy(() =>
    import('../pages/PolicyPage').then((m) => ({
      default: () => <m.PolicyPage slug="terms" />,
    })),
  ),
  dashboard: lazy(() =>
    import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
  ),
};
