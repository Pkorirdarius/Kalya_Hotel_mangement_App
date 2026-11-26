import type { ComponentType } from 'react';

import { BookingManagePage } from '../pages/BookingManagePage';
import { BookingPage } from '../pages/BookingPage';
import { BlogIndexPage } from '../pages/BlogIndexPage';
import { BlogPostPage } from '../pages/BlogPostPage';
import { ConferencePage } from '../pages/ConferencePage';
import { ContentConfirmationPage } from '../pages/ContentConfirmationPage';
import { ContactPage } from '../pages/ContactPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DiningPage } from '../pages/DiningPage';
import { FacilitiesPage } from '../pages/FacilitiesPage';
import { GymPage } from '../pages/GymPage';
import { HomePage } from '../pages/HomePage';
import { OffersPage } from '../pages/OffersPage';
import { PolicyPage } from '../pages/PolicyPage';
import { RoomsPage } from '../pages/RoomsPage';
import type { RouteComponentId } from './routes';

/**
 * Non-lazy page map for server rendering. Lazy components suspend, which
 * `renderToString` cannot resolve; the browser keeps `ROUTE_COMPONENTS` so this
 * map is only loaded by the prerender build.
 */
export const SSR_ROUTE_COMPONENTS: Record<RouteComponentId, ComponentType> = {
  home: HomePage,
  rooms: RoomsPage,
  booking: BookingPage,
  'manage-booking': BookingManagePage,
  facilities: FacilitiesPage,
  dining: DiningPage,
  conference: ConferencePage,
  gym: GymPage,
  offers: OffersPage,
  blog: BlogIndexPage,
  'blog-post': BlogPostPage,
  contact: ContactPage,
  privacy: () => <PolicyPage slug="privacy" />,
  terms: () => <PolicyPage slug="terms" />,
  dashboard: DashboardPage,
  'content-review': ContentConfirmationPage,
};
