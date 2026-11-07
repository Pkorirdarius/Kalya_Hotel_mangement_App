import { LANGUAGE_CHANGE_EVENT, formatDate, t } from '../i18n';
import { addDaysISO, isValidEmail, isValidKenyanPhone, todayISO } from '../utils';
import { clearErrors, fakeDelay, setFieldError, showToast } from './ui';

type Venue = 'restaurant' | 'coffee';

interface TableState {
  venue: Venue;
  reference: string;
  date: string;
  time: string;
  party: string;
  name: string;
  phone: string;
  email: string;
  occasion: string;
}

function q<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element;
}

function qa<T extends Element>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

function venueName(venue: Venue): string {
  return venue === 'restaurant' ? t('facility.restaurant.name') : t('facility.coffee.name');
}

function setVenue(venue: Venue): void {
  qa<HTMLButtonElement>('[data-venue-tab]').forEach((button) => {
    const active = button.dataset.venueTab === venue;
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    button.classList.toggle('bg-forest', active);
    button.classList.toggle('text-white', active);
    button.classList.toggle('text-muted', !active);
    button.classList.toggle('hover:text-forest', !active);
  });

  qa<HTMLElement>('[data-venue-panel]').forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.venuePanel !== venue);
  });

  document.querySelectorAll<HTMLInputElement>('[data-table-venue]').forEach((input) => {
    input.value = venue;
  });
}

export function initDining(): void {
  const form = document.querySelector<HTMLFormElement>('[data-table-form]');
  if (!form) {
    return;
  }

  const wrap = q<HTMLElement>('[data-table-form-wrap]');
  const success = q<HTMLElement>('[data-table-success]');
  const referenceEl = q<HTMLElement>('[data-table-reference]');
  const summaryEl = q<HTMLElement>('[data-table-summary]');
  const dateInput = q<HTMLInputElement>('#table-date', form);
  const nameInput = q<HTMLInputElement>('#table-name', form);
  const phoneInput = q<HTMLInputElement>('#table-phone', form);
  const emailInput = q<HTMLInputElement>('#table-email', form);
  const partyInput = q<HTMLSelectElement>('#table-party', form);
  const occasionInput = q<HTMLSelectElement>('#table-occasion', form);
  const submitButton = q<HTMLButtonElement>('button[type="submit"]', form);

  const params = new URLSearchParams(window.location.search);
  const requestedVenue = params.get('venue');
  let state: TableState = {
    venue: requestedVenue === 'coffee' ? 'coffee' : 'restaurant',
    reference: '',
    date: '',
    time: '',
    party: partyInput.value,
    name: '',
    phone: '',
    email: '',
    occasion: occasionInput.value,
  };

  const today = todayISO();
  dateInput.min = today;
  dateInput.value = addDaysISO(today, 1);

  setVenue(state.venue);

  qa<HTMLButtonElement>('[data-venue-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const venue = button.dataset.venueTab === 'coffee' ? 'coffee' : 'restaurant';
      state.venue = venue;
      setVenue(venue);
    });
  });

  form.querySelectorAll<HTMLInputElement>('input[name="time"]').forEach((input) => {
    input.addEventListener('change', () => {
      const group = input.closest<HTMLElement>('[data-field]');
      const errorEl = group?.querySelector<HTMLElement>('[data-error]');
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
      }
    });
  });

  dateInput.addEventListener('change', () => {
    if (dateInput.value && dateInput.value < today) {
      dateInput.value = today;
    }
  });

  function renderSummary(): void {
    if (!state.reference) {
      return;
    }
    const meal = state.occasion === 'meal' ? '' : ` · ${t(`occasion.${state.occasion}`)}`;
    summaryEl.textContent = `${venueName(state.venue)} · ${formatDate(state.date)} · ${state.time} · ${state.party} ${t('common.guests')}${meal}`;
    referenceEl.textContent = state.reference;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);

    const date = dateInput.value;
    const timeInput = form.querySelector<HTMLInputElement>('input[name="time"]:checked');
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();

    let valid = true;

    if (!date || date < today) {
      setFieldError(dateInput, t('validation.date'));
      valid = false;
    }

    if (!timeInput) {
      const group = qa<HTMLElement>('[data-field]', form).find((field) => field.querySelector('input[name="time"]'));
      const errorEl = group?.querySelector<HTMLElement>('[data-error]');
      if (errorEl) {
        errorEl.textContent = t('validation.time');
        errorEl.classList.remove('hidden');
      }
      valid = false;
    }

    if (name.length < 2) {
      setFieldError(nameInput, t('validation.name'));
      valid = false;
    }

    if (!isValidKenyanPhone(phone)) {
      setFieldError(phoneInput, t('validation.phone'));
      valid = false;
    }

    if (email && !isValidEmail(email)) {
      setFieldError(emailInput, t('validation.email'));
      valid = false;
    }

    if (!valid) {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    submitButton.disabled = true;
    const label = submitButton.querySelector<HTMLElement>('[data-i18n]');
    const originalLabel = label?.textContent ?? '';
    if (label) {
      label.textContent = t('common.sending');
    }

    await fakeDelay(900);

    state = {
      venue: state.venue,
      reference: `TB-${Math.floor(1000 + Math.random() * 9000)}`,
      date,
      time: timeInput?.value ?? '',
      party: partyInput.value,
      name,
      phone,
      email,
      occasion: occasionInput.value,
    };

    renderSummary();
    wrap.classList.add('hidden');
    success.classList.remove('hidden');
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast(t('toast.tableBooked'));

    submitButton.disabled = false;
    if (label) {
      label.textContent = originalLabel;
    }
  });

  q<HTMLButtonElement>('[data-table-again]').addEventListener('click', () => {
    form.reset();
    clearErrors(form);
    dateInput.min = today;
    dateInput.value = addDaysISO(today, 1);
    partyInput.value = '2';
    occasionInput.value = 'meal';
    state = {
      ...state,
      reference: '',
      date: '',
      time: '',
      party: '2',
      name: '',
      phone: '',
      email: '',
      occasion: 'meal',
    };
    success.classList.add('hidden');
    wrap.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    nameInput.focus();
  });

  document.addEventListener(LANGUAGE_CHANGE_EVENT, renderSummary);

  if (state.venue === 'coffee') {
    q<HTMLButtonElement>('#tab-coffee').focus();
  }
}
