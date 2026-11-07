const DRAWER_TOGGLE_ID = 'nav-drawer-toggle';
const DRAWER_CLOSE_ID = 'nav-drawer-close';
const DRAWER_BACKDROP_ID = 'nav-drawer-backdrop';
const DRAWER_ID = 'nav-drawer';

export function initNavDrawer(): void {
  const toggleButton = document.getElementById(DRAWER_TOGGLE_ID);
  const closeButton = document.getElementById(DRAWER_CLOSE_ID);
  const backdrop = document.getElementById(DRAWER_BACKDROP_ID);
  const drawer = document.getElementById(DRAWER_ID);

  if (!toggleButton || !closeButton || !backdrop || !drawer) {
    return;
  }

  let previousFocus: HTMLElement | null = null;

  const openMenu = (): void => {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    drawer.classList.remove('translate-x-full');
    drawer.setAttribute('aria-hidden', 'false');
    toggleButton.setAttribute('aria-expanded', 'true');
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100');
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => closeButton.focus(), 80);
  };

  const closeMenu = (): void => {
    drawer.classList.add('translate-x-full');
    drawer.setAttribute('aria-hidden', 'true');
    toggleButton.setAttribute('aria-expanded', 'false');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    backdrop.classList.remove('opacity-100');
    document.body.style.overflow = '';
    previousFocus?.focus();
  };

  toggleButton.addEventListener('click', openMenu);
  closeButton.addEventListener('click', closeMenu);
  backdrop.addEventListener('click', closeMenu);
  drawer.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.getAttribute('aria-hidden') === 'false') {
      closeMenu();
    }
  });
}
