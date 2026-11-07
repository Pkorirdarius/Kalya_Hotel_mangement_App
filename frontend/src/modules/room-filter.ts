import { ROOM_CATEGORIES, type RoomFilterValue } from '../types';

const FILTER_BUTTON_SELECTOR = '#room-filter-container .filter-chip';
const ROOM_CARD_SELECTOR = '.room-card';

const ACTIVE_BUTTON_CLASSES = ['bg-primary', 'text-on-primary', 'shadow-sm'] as const;
const INACTIVE_BUTTON_CLASSES = ['bg-surface-container', 'text-on-surface-variant'] as const;

const SHOW_DELAY_MS = 10;
const HIDE_DELAY_MS = 200;

function isRoomFilterValue(value: string | null): value is RoomFilterValue {
  return value === 'all' || ROOM_CATEGORIES.some((category) => category === value);
}

function setActive(button: HTMLButtonElement): void {
  button.classList.remove(...INACTIVE_BUTTON_CLASSES);
  button.classList.add(...ACTIVE_BUTTON_CLASSES);
}

function setInactive(button: HTMLButtonElement): void {
  button.classList.remove(...ACTIVE_BUTTON_CLASSES);
  button.classList.add(...INACTIVE_BUTTON_CLASSES);
}

/**
 * Filters the room cards by category exactly like the original inline script,
 * including the fade/slide transition used when cards are shown or hidden.
 */
export function initRoomFilter(): void {
  const filterButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(FILTER_BUTTON_SELECTOR),
  );
  const cards = Array.from(document.querySelectorAll<HTMLElement>(ROOM_CARD_SELECTOR));

  if (filterButtons.length === 0 || cards.length === 0) {
    return;
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filterValue = button.getAttribute('data-filter');

      if (!isRoomFilterValue(filterValue)) {
        return;
      }

      filterButtons.forEach(setInactive);
      setActive(button);

      cards.forEach((card) => {
        const category = card.getAttribute('data-category');

        if (filterValue === 'all' || category === filterValue) {
          card.style.display = 'flex';
          window.setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, SHOW_DELAY_MS);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(8px)';
          window.setTimeout(() => {
            card.style.display = 'none';
          }, HIDE_DELAY_MS);
        }
      });
    });
  });
}
