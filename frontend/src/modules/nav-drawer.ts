const DRAWER_TOGGLE_ID = 'nav-drawer-toggle';
const DRAWER_CLOSE_ID = 'nav-drawer-close';
const DRAWER_BACKDROP_ID = 'nav-drawer-backdrop';
const DRAWER_ID = 'nav-drawer';

/**
 * Wires the slide-in navigation drawer, its close button and the backdrop.
 * Behaviour mirrors the original inline script exactly.
 */
export function initNavDrawer(): void {
  const toggleButton = document.getElementById(DRAWER_TOGGLE_ID);
  const closeButton = document.getElementById(DRAWER_CLOSE_ID);
  const backdrop = document.getElementById(DRAWER_BACKDROP_ID);
  const drawer = document.getElementById(DRAWER_ID);

  if (!toggleButton || !closeButton || !backdrop || !drawer) {
    return;
  }

  const openMenu = (): void => {
    drawer.classList.remove('translate-x-full');
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100');
  };

  const closeMenu = (): void => {
    drawer.classList.add('translate-x-full');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    backdrop.classList.remove('opacity-100');
  };

  toggleButton.addEventListener('click', openMenu);
  closeButton.addEventListener('click', closeMenu);
  backdrop.addEventListener('click', closeMenu);
}
