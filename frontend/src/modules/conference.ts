import { LANGUAGE_CHANGE_EVENT, formatDate, getCurrentLanguage, t } from '../i18n';
import { addDaysISO, isValidEmail, isValidKenyanPhone, todayISO } from '../utils';
import { clearErrors, fakeDelay, setFieldError, showToast } from './ui';

type Mode = 'instant' | 'quote';
type Availability = 'available' | 'limited' | 'full';

interface ConfState {
  mode: Mode;
  reference: string;
  date: string;
  session: string;
  layout: string;
  guests: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

const TAB_ACTIVE = ['bg-white', 'text-forest', 'shadow-sm'];
const TAB_IDLE = ['text-muted', 'hover:text-forest'];

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

function dayNumber(iso: string): number {
  return Number(iso.slice(8, 10));
}

function availabilityFor(iso: string): Availability {
  const day = dayNumber(iso);
  if (day % 7 === 0) {
    return 'full';
  }
  if (day % 3 === 0) {
    return 'limited';
  }
  return 'available';
}

export function initConference(): void {
  const form = document.querySelector<HTMLFormElement>('[data-conf-form]');
  if (!form) {
    return;
  }

  const wrap = q<HTMLElement>('[data-conf-form-wrap]');
  const success = q<HTMLElement>('[data-conf-success]');
  const referenceEl = q<HTMLElement>('[data-conf-reference]');
  const summaryEl = q<HTMLElement>('[data-conf-summary]');
  const submitLabel = q<HTMLElement>('[data-conf-submit-label]');
  const noteText = q<HTMLElement>('[data-conf-note-text]');
  const quoteOnly = q<HTMLElement>('[data-quote-only]');
  const dateInput = q<HTMLInputElement>('#conf-date', form);
  const sessionInput = q<HTMLSelectElement>('#conf-session', form);
  const layoutInput = q<HTMLSelectElement>('#conf-layout', form);
  const guestsInput = q<HTMLInputElement>('#conf-guests', form);
  const nameInput = q<HTMLInputElement>('#conf-name', form);
  const emailInput = q<HTMLInputElement>('#conf-email', form);
  const phoneInput = q<HTMLInputElement>('#conf-phone', form);
  const notesInput = q<HTMLTextAreaElement>('#conf-notes', form);
  const submitButton = q<HTMLButtonElement>('button[type="submit"]', form);
  const calendar = q<HTMLElement>('[data-conf-calendar]');
  const today = todayISO();
  dateInput.min = today;
  dateInput.value = addDaysISO(today, 1);

  let state: ConfState = {
    mode: 'instant',
    reference: '',
    date: dateInput.value,
    session: sessionInput.value,
    layout: layoutInput.value,
    guests: guestsInput.value,
    name: '',
    email: '',
    phone: '',
    notes: '',
  };

  const STATUS_KEY: Record<Availability, string> = {
    available: 'availability.available',
    limited: 'availability.limited',
    full: 'availability.full',
  };

  const STATUS_DOT: Record<Availability, string> = {
    available: 'bg-[#1FA855]',
    limited: 'bg-gold',
    full: 'bg-red-400',
  };

  function renderCalendar(): void {
    const lang = getCurrentLanguage();
    const weekday = new Intl.DateTimeFormat(lang === 'sw' ? 'sw-KE' : 'en-GB', { weekday: 'short' });
    const selected = dateInput.value;
    calendar.replaceChildren();

    for (let index = 0; index < 10; index += 1) {
      const iso = addDaysISO(today, index);
      const date = new Date(`${iso}T12:00:00`);
      const status = availabilityFor(iso);
      const isSelected = iso === selected;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.calendarIso = iso;
      button.disabled = status === 'full';
      button.className = [
        'relative flex min-h-[62px] flex-col items-center justify-center rounded-xl border p-1.5 text-center transition',
        isSelected ? 'border-forest bg-forest text-white' : 'border-line bg-cream text-forest hover:border-forest/40',
        status === 'full' ? 'cursor-not-allowed opacity-45' : '',
      ]
        .filter(Boolean)
        .join(' ');
      button.setAttribute('aria-label', `${weekday.format(date)} ${date.getDate()} — ${t(STATUS_KEY[status])}`);

      const label = document.createElement('span');
      label.className = 'text-[9px] font-bold uppercase tracking-wide opacity-70';
      label.textContent = weekday.format(date);

      const number = document.createElement('span');
      number.className = 'mt-0.5 text-[16px] font-extrabold';
      number.textContent = String(date.getDate());

      const dot = document.createElement('span');
      dot.className = `mt-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : STATUS_DOT[status]}`;

      button.append(label, number, dot);
      button.addEventListener('click', () => {
        if (status === 'full') {
          return;
        }
        dateInput.value = iso;
        state.date = iso;
        renderCalendar();
      });

      calendar.appendChild(button);
    }
  }

  function renderSummary(): void {
    if (!state.reference) {
      return;
    }
    referenceEl.textContent = state.reference;
    summaryEl.textContent = `${formatDate(state.date)} · ${t(`session.${state.session}`)} · ${t(`layout.${state.layout}`)} · ${state.guests} ${t('common.guests')}`;
  }

  function setMode(mode: Mode): void {
    state.mode = mode;
    qa<HTMLButtonElement>('[data-conf-tab]').forEach((button) => {
      const active = button.dataset.confTab === mode;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      TAB_ACTIVE.forEach((className) => button.classList.toggle(className, active));
      TAB_IDLE.forEach((className) => button.classList.toggle(className, !active));
    });

    const isQuote = mode === 'quote';
    quoteOnly.classList.toggle('hidden', !isQuote);
    submitLabel.textContent = t(isQuote ? 'conference.quoteSubmit' : 'conference.instantSubmit');
    submitLabel.dataset.i18n = isQuote ? 'conference.quoteSubmit' : 'conference.instantSubmit';
    noteText.textContent = t(isQuote ? 'conference.quoteNote' : 'conference.instantNote');
  }

  qa<HTMLButtonElement>('[data-conf-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      setMode(button.dataset.confTab === 'quote' ? 'quote' : 'instant');
    });
  });

  dateInput.addEventListener('change', () => {
    if (!dateInput.value || dateInput.value < today) {
      dateInput.value = addDaysISO(today, 1);
    }
    state.date = dateInput.value;
    renderCalendar();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);

    const date = dateInput.value;
    const guests = Number(guestsInput.value);
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    let valid = true;

    if (!date || date < today) {
      setFieldError(dateInput, t('validation.date'));
      valid = false;
    }
    if (!Number.isFinite(guests) || guests < 4 || guests > 120) {
      setFieldError(guestsInput, t('validation.guests'));
      valid = false;
    }
    if (name.length < 2) {
      setFieldError(nameInput, t('validation.name'));
      valid = false;
    }
    if (!isValidEmail(email)) {
      setFieldError(emailInput, t('validation.email'));
      valid = false;
    }
    if (!isValidKenyanPhone(phone)) {
      setFieldError(phoneInput, t('validation.phone'));
      valid = false;
    }

    if (!valid) {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    submitButton.disabled = true;
    const currentLabel = submitLabel.textContent;
    submitLabel.textContent = t('common.sending');

    await fakeDelay(1000);

    state = {
      mode: state.mode,
      reference: `${state.mode === 'quote' ? 'KQ' : 'KH'}-${Math.floor(1000 + Math.random() * 9000)}`,
      date,
      session: sessionInput.value,
      layout: layoutInput.value,
      guests: String(guests),
      name,
      email,
      phone,
      notes: notesInput.value.trim(),
    };

    renderSummary();
    wrap.classList.add('hidden');
    success.classList.remove('hidden');
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast(state.mode === 'quote' ? t('toast.quoteSent') : t('toast.hallBooked'));

    submitButton.disabled = false;
    if (currentLabel) {
      submitLabel.textContent = currentLabel;
    }
  });

  q<HTMLButtonElement>('[data-conf-again]').addEventListener('click', () => {
    form.reset();
    clearErrors(form);
    dateInput.min = today;
    dateInput.value = addDaysISO(today, 1);
    guestsInput.value = '20';
    state = {
      ...state,
      reference: '',
      date: dateInput.value,
      session: sessionInput.value,
      layout: layoutInput.value,
      guests: '20',
      name: '',
      email: '',
      phone: '',
      notes: '',
    };
    success.classList.add('hidden');
    wrap.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    nameInput.focus();
  });

  document.addEventListener(LANGUAGE_CHANGE_EVENT, () => {
    setMode(state.mode);
    renderCalendar();
    renderSummary();
  });

  renderCalendar();
  setMode('instant');
}
