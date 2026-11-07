import { addDaysISO, nightsBetween, todayISO } from '../utils';
import { setFieldError } from './ui';

function initBookingSearch(): void {
  const form = document.querySelector<HTMLFormElement>('[data-booking-search]');
  if (!form) {
    return;
  }

  const checkin = form.querySelector<HTMLInputElement>('input[name="checkin"]');
  const checkout = form.querySelector<HTMLInputElement>('input[name="checkout"]');

  if (!checkin || !checkout) {
    return;
  }

  const today = todayISO();
  checkin.min = today;
  checkout.min = addDaysISO(today, 1);

  if (!checkin.value) {
    checkin.value = addDaysISO(today, 7);
  }
  if (!checkout.value) {
    checkout.value = addDaysISO(checkin.value || today, 2);
  }

  const syncCheckout = (): void => {
    const minCheckout = addDaysISO(checkin.value || today, 1);
    checkout.min = minCheckout;

    if (!checkout.value || checkout.value < minCheckout) {
      checkout.value = minCheckout;
    }
  };

  checkin.addEventListener('change', () => {
    syncCheckout();
    setFieldError(checkin, null);
  });

  checkout.addEventListener('change', () => {
    if (checkin.value && checkout.value <= checkin.value) {
      setFieldError(checkout, 'Check-out must be after check-in.');
    } else {
      setFieldError(checkout, null);
    }
  });

  form.addEventListener('submit', (event) => {
    const nights = nightsBetween(checkin.value, checkout.value);
    if (nights < 1) {
      event.preventDefault();
      setFieldError(checkout, 'Check-out must be after check-in.');
      checkout.focus();
      return;
    }
  });
}

function initOffersCarousel(): void {
  const track = document.querySelector<HTMLElement>('[data-offers-carousel]');
  if (!track) {
    return;
  }

  const section = track.closest('section');
  const prev = section?.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const next = section?.querySelector<HTMLButtonElement>('[data-carousel-next]');

  const step = (): number => {
    const first = track.querySelector<HTMLElement>('article');
    if (!first) {
      return track.clientWidth;
    }
    return first.getBoundingClientRect().width + 20;
  };

  const updateButtons = (): void => {
    if (!prev || !next) {
      return;
    }
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };

  prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons);
  updateButtons();
}

export function initHome(): void {
  initBookingSearch();
  initOffersCarousel();
}
