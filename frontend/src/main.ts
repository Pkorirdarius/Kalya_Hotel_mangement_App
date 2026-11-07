import './styles/main.css';

import { initLanguageSwitcher } from './modules/language-switcher';
import { initNavDrawer } from './modules/nav-drawer';
import { initRoomFilter } from './modules/room-filter';

/**
 * Boots every interactive element on the rooms page. Call after the DOM is
 * parsed, matching the timing of the original inline scripts.
 */
function bootstrap(): void {
  initLanguageSwitcher();
  initNavDrawer();
  initRoomFilter();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
