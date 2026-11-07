import './styles/main.css';

import { initI18n, initLanguageSwitcher } from './i18n';
import { initLayout } from './layout';
import { initNavDrawer } from './modules/nav-drawer';
import { initBookingFlow } from './modules/booking';
import { initConference } from './modules/conference';
import { initContact } from './modules/contact';
import { initDashboard } from './modules/dashboard';
import { initDining } from './modules/dining';
import { initGym } from './modules/gym';
import { initHome } from './modules/home';
import { initNewsletterForms } from './modules/newsletter';
import { initOffers } from './modules/offers';
import { initRooms } from './modules/rooms';
import type { PageId } from './types';

const pageInits: Record<PageId, () => void> = {
  home: initHome,
  rooms: initRooms,
  booking: initBookingFlow,
  facilities: initHome,
  dining: initDining,
  conference: initConference,
  gym: initGym,
  dashboard: initDashboard,
  offers: initOffers,
  contact: initContact,
};

function bootstrap(): void {
  initLayout();
  initI18n();
  initLanguageSwitcher();
  initNavDrawer();
  initNewsletterForms();

  const page = (document.body.dataset.page ?? 'home') as PageId;
  pageInits[page]?.();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
