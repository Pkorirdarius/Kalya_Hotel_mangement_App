import { LANGUAGE_CHANGE_EVENT, formatDate, formatMoney, t } from '../i18n';
import { MEAL_PLANS, ROOMS, type MealPlanId } from '../types';
import { addDaysISO, nightsBetween, todayISO } from '../utils';
import { clearErrors, fakeDelay, setFieldError, showToast } from './ui';

type PaymentMethod = 'mpesa' | 'card' | 'bank';

interface BookingState {
  step: number;
  checkin: string;
  checkout: string;
  guests: number;
  roomId: string;
  mealId: MealPlanId;
  payment: PaymentMethod;
  reference: string;
}

const STEP_LABEL_KEYS: Record<number, string> = {
  1: 'step.dates',
  2: 'step.room',
  3: 'step.details',
  4: 'step.payment',
  5: 'step.confirm',
};

const DOT_BASE = 'flex h-10 w-10 items-center justify-center rounded-full border text-[13px] font-bold transition';
const DOT_ACTIVE = 'border-forest bg-forest text-white';
const DOT_COMPLETE = 'border-gold bg-gold text-forest-dark';
const DOT_UPCOMING = 'border-line bg-white text-muted';

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

function money(amount: number): string {
  return `KES ${formatMoney(amount)}`;
}

function isMealPlanId(value: string | null): value is MealPlanId {
  return MEAL_PLANS.some((plan) => plan.id === value);
}

function phoneDigits(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

function isPhone(value: string): boolean {
  return /^\+?\d{9,15}$/.test(phoneDigits(value));
}

export function initBookingFlow(): void {
  const form = document.querySelector<HTMLFormElement>('[data-booking-form]');
  if (!form) {
    return;
  }

  const checkinInput = q<HTMLInputElement>('#booking-checkin', form);
  const checkoutInput = q<HTMLInputElement>('#booking-checkout', form);
  const guestsSelect = q<HTMLSelectElement>('#booking-guests', form);
  const panels = qa<HTMLElement>('[data-step-panel]', form);
  const indicators = qa<HTMLElement>('[data-step-indicator]', form);
  const progressFill = q<HTMLElement>('[data-progress-fill]', form);
  const currentStepLabel = q<HTMLElement>('[data-current-step]', form);
  const stepNights = q<HTMLElement>('[data-step-nights]', form);
  const submitButton = q<HTMLButtonElement>('[data-submit-booking]', form);
  const submitLabel = q<HTMLElement>('[data-submit-label]', form);
  const paymentError = q<HTMLElement>('[data-payment-error]', form);
  const mobileSummary = document.querySelector<HTMLElement>('[data-mobile-summary]');
  const mobileToggle = document.querySelector<HTMLButtonElement>('[data-mobile-summary-toggle]');
  const mobileDetails = document.getElementById('mobile-summary-details');

  const roomInputs = qa<HTMLInputElement>('[data-room-option]', form);
  const mealInputs = qa<HTMLInputElement>('[data-meal-option]', form);
  const paymentInputs = qa<HTMLInputElement>('[data-payment-option]', form);
  const paymentPanels = qa<HTMLElement>('[data-payment-panel]', form);

  const firstName = q<HTMLInputElement>('#guest-first', form);
  const lastName = q<HTMLInputElement>('#guest-last', form);
  const email = q<HTMLInputElement>('#guest-email', form);
  const phone = q<HTMLInputElement>('#guest-phone', form);
  const terms = q<HTMLInputElement>('input[name="terms"]', form);

  const mpesaPhone = q<HTMLInputElement>('#mpesa-phone', form);
  const cardNumber = q<HTMLInputElement>('#card-number', form);
  const cardName = q<HTMLInputElement>('#card-name', form);
  const cardExpiry = q<HTMLInputElement>('#card-expiry', form);
  const cardCvv = q<HTMLInputElement>('#card-cvv', form);

  const summaryRoomTotal = qa<HTMLElement>('[data-summary-room-total]');
  const summaryMealLabels = qa<HTMLElement>('[data-summary-meal-label]');
  const summaryMealTotal = qa<HTMLElement>('[data-summary-meal-total]');
  const summaryTotal = qa<HTMLElement>('[data-summary-total]');
  const summaryDeposit = qa<HTMLElement>('[data-summary-deposit]');
  const mobileTotal = qa<HTMLElement>('[data-mobile-total]');
  const mobileRoomTotal = qa<HTMLElement>('[data-mobile-room-total]');
  const mobileMealTotal = qa<HTMLElement>('[data-mobile-meal-total]');

  const params = new URLSearchParams(window.location.search);
  const today = todayISO();
  const offer = params.get('offer');

  let defaultCheckin = params.get('checkin') ?? addDaysISO(today, 7);
  let defaultCheckout = params.get('checkout') ?? addDaysISO(defaultCheckin, 2);

  if (offer === 'long-stay') {
    defaultCheckin = addDaysISO(today, 1);
    defaultCheckout = addDaysISO(defaultCheckin, 4);
  }

  if (defaultCheckin < today) {
    defaultCheckin = addDaysISO(today, 7);
    defaultCheckout = addDaysISO(defaultCheckin, 2);
  }
  if (defaultCheckout <= defaultCheckin) {
    defaultCheckout = addDaysISO(defaultCheckin, 2);
  }

  const requestedRoom = params.get('room');
  const roomId =
    offer === 'ngo'
      ? 'standard-executive'
      : ROOMS.find((room) => room.id === requestedRoom)?.id ?? ROOMS[0].id;

  const requestedMeal = params.get('meal');
  const mealId = isMealPlanId(requestedMeal) ? requestedMeal : 'breakfast';

  const requestedGuests = Number(params.get('guests') ?? 2);
  const guests =
    Number.isInteger(requestedGuests) && requestedGuests >= 1 && requestedGuests <= 4
      ? requestedGuests
      : 2;

  const state: BookingState = {
    step: 1,
    checkin: defaultCheckin,
    checkout: defaultCheckout,
    guests,
    roomId,
    mealId,
    payment: 'mpesa',
    reference: '',
  };

  checkinInput.min = today;
  checkinInput.value = state.checkin;
  checkoutInput.min = addDaysISO(state.checkin, 1);
  checkoutInput.value = state.checkout;
  guestsSelect.value = String(state.guests);

  roomInputs.forEach((input) => {
    input.checked = input.value === state.roomId;
  });
  mealInputs.forEach((input) => {
    input.checked = input.value === state.mealId;
  });
  paymentInputs.forEach((input) => {
    input.checked = input.value === state.payment;
  });

  function currentRoom(): (typeof ROOMS)[number] {
    return ROOMS.find((room) => room.id === state.roomId) ?? ROOMS[0];
  }

  function currentMeal(): (typeof MEAL_PLANS)[number] {
    return MEAL_PLANS.find((plan) => plan.id === state.mealId) ?? MEAL_PLANS[1];
  }

  function currentNights(): number {
    return Math.max(0, nightsBetween(state.checkin, state.checkout));
  }

  function setText(elements: HTMLElement[], value: string): void {
    elements.forEach((element) => {
      element.textContent = value;
    });
  }

  function updateSummary(): void {
    const room = currentRoom();
    const meal = currentMeal();
    const nights = currentNights();
    const roomTotal = room.price * nights;
    const mealTotal = meal.supplement * state.guests * nights;
    const total = roomTotal + mealTotal;
    const nightLabel = nights === 1 ? t('common.night') : t('common.nights');

    setText([q<HTMLElement>('[data-summary-room]')], t(room.nameKey));
    setText([q<HTMLElement>('[data-summary-dates]')], nights > 0 ? `${formatDate(state.checkin)} → ${formatDate(state.checkout)}` : '—');
    setText(
      [q<HTMLElement>('[data-summary-meta]')],
      `${state.guests} ${t('common.guests').toLowerCase()} · ${nights} ${nightLabel}`,
    );
    setText(summaryRoomTotal, money(roomTotal));
    setText(summaryMealLabels, t(meal.labelKey));
    setText(summaryMealTotal, meal.supplement === 0 ? t('meal.included') : money(mealTotal));
    setText(summaryTotal, money(total));
    setText(summaryDeposit, money(total));
    setText(mobileTotal, money(total));
    setText(mobileRoomTotal, money(roomTotal));
    setText(mobileMealTotal, meal.supplement === 0 ? t('meal.included') : money(mealTotal));
    stepNights.textContent = `${nights} ${nightLabel}`;
    submitLabel.textContent = `${t('payment.payNow')} · ${money(total)}`;
  }

  function updateStepLabel(): void {
    currentStepLabel.textContent = `${t(STEP_LABEL_KEYS[state.step])} · ${state.step} / 5`;
  }

  function updatePaymentPanels(): void {
    paymentPanels.forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.paymentPanel !== state.payment);
    });
    paymentError.classList.add('hidden');
  }

  function goToStep(step: number, scroll = true): void {
    state.step = Math.min(5, Math.max(1, step));

    panels.forEach((panel) => {
      const panelStep = Number(panel.dataset.stepPanel);
      panel.classList.toggle('hidden', panelStep !== state.step);
    });

    indicators.forEach((indicator) => {
      const indicatorStep = Number(indicator.dataset.stepIndicator);
      const dot = q<HTMLElement>('[data-step-dot]', indicator);
      const number = q<HTMLElement>('[data-step-number]', indicator);
      const check = q<HTMLElement>('[data-step-check]', indicator);
      const label = q<HTMLElement>('[data-step-label]', indicator);
      const complete = indicatorStep < state.step;
      const active = indicatorStep === state.step;

      dot.className = `${DOT_BASE} ${active ? DOT_ACTIVE : complete ? DOT_COMPLETE : DOT_UPCOMING}`;
      number.classList.toggle('hidden', complete);
      check.classList.toggle('hidden', !complete);
      label.className = `hidden text-[11px] sm:block ${
        active
          ? 'font-bold text-forest'
          : complete
            ? 'font-semibold text-forest'
            : 'font-semibold text-muted'
      }`;

      if (active) {
        indicator.setAttribute('aria-current', 'step');
      } else {
        indicator.removeAttribute('aria-current');
      }
    });

    progressFill.style.width = `${((state.step - 1) / 4) * 100}%`;
    updateStepLabel();

    if (mobileSummary) {
      mobileSummary.classList.toggle('hidden', state.step === 5);
    }

    if (state.step === 4 && !mpesaPhone.value.trim()) {
      mpesaPhone.value = phone.value;
    }

    if (scroll) {
      form!.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function validateDates(): boolean {
    clearErrors(form!);
    let firstInvalid: HTMLElement | null = null;

    if (!checkinInput.value) {
      setFieldError(checkinInput, t('common.required'));
      firstInvalid ??= checkinInput;
    } else if (checkinInput.value < today) {
      setFieldError(checkinInput, t('validation.dates'));
      firstInvalid ??= checkinInput;
    }

    if (!checkoutInput.value) {
      setFieldError(checkoutInput, t('common.required'));
      firstInvalid ??= checkoutInput;
    }

    if (nightsBetween(state.checkin, state.checkout) < 1) {
      setFieldError(checkoutInput, t('validation.dates'));
      firstInvalid ??= checkoutInput;
    }

    firstInvalid?.focus();
    return !firstInvalid;
  }

  function validateGuestDetails(): boolean {
    clearErrors(form!);
    let firstInvalid: HTMLElement | null = null;

    const require = (input: HTMLInputElement): void => {
      if (!input.value.trim()) {
        setFieldError(input, t('common.required'));
        firstInvalid ??= input;
      }
    };

    require(firstName);
    require(lastName);
    require(phone);

    if (!email.value.trim()) {
      setFieldError(email, t('common.required'));
      firstInvalid ??= email;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
      setFieldError(email, t('validation.email'));
      firstInvalid ??= email;
    }

    if (phone.value.trim() && !isPhone(phone.value)) {
      setFieldError(phone, t('validation.phone'));
      firstInvalid ??= phone;
    }

    if (!terms.checked) {
      setFieldError(terms, t('validation.terms'));
      firstInvalid ??= terms;
    }

    firstInvalid?.focus();
    return !firstInvalid;
  }

  function validatePayment(): boolean {
    clearErrors(form!);
    paymentError.classList.add('hidden');
    let firstInvalid: HTMLElement | null = null;

    if (state.payment === 'mpesa') {
      if (!mpesaPhone.value.trim()) {
        setFieldError(mpesaPhone, t('validation.mpesa'));
        firstInvalid = mpesaPhone;
      } else if (!isPhone(mpesaPhone.value)) {
        setFieldError(mpesaPhone, t('validation.phone'));
        firstInvalid = mpesaPhone;
      }
    }

    if (state.payment === 'card') {
      if (cardNumber.value.replace(/\s/g, '').length < 13) {
        setFieldError(cardNumber, t('validation.card'));
        firstInvalid ??= cardNumber;
      }
      if (!cardName.value.trim()) {
        setFieldError(cardName, t('validation.card'));
        firstInvalid ??= cardName;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry.value.trim())) {
        setFieldError(cardExpiry, t('validation.card'));
        firstInvalid ??= cardExpiry;
      }
      if (!/^\d{3,4}$/.test(cardCvv.value.trim())) {
        setFieldError(cardCvv, t('validation.card'));
        firstInvalid ??= cardCvv;
      }
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }

    return true;
  }

  function completeBooking(): void {
    const room = currentRoom();
    const meal = currentMeal();
    const nights = currentNights();
    const total = room.price * nights + meal.supplement * state.guests * nights;
    state.reference = `KY-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    q<HTMLElement>('[data-confirm-reference]').textContent = state.reference;
    q<HTMLElement>('[data-confirm-email]').textContent = email.value.trim();
    q<HTMLElement>('[data-confirm-room]').textContent = t(room.nameKey);
    q<HTMLElement>('[data-confirm-meal]').textContent = t(meal.labelKey);
    q<HTMLElement>('[data-confirm-checkin]').textContent = formatDate(state.checkin);
    q<HTMLElement>('[data-confirm-checkout]').textContent = formatDate(state.checkout);
    q<HTMLElement>('[data-confirm-guests]').textContent = `${state.guests} ${t('common.guests').toLowerCase()} · ${nights} ${
      nights === 1 ? t('common.night') : t('common.nights')
    }`;
    q<HTMLElement>('[data-confirm-total]').textContent = money(total);

    const paymentBadge = q<HTMLElement>('[data-confirm-payment]');
    if (state.payment === 'bank') {
      paymentBadge.textContent = t('confirmation.pending');
      paymentBadge.className = 'pill bg-gold-soft text-gold-deep ring-1 ring-gold/30';
    } else {
      paymentBadge.textContent = t('confirmation.paid');
      paymentBadge.className = 'pill bg-white text-forest ring-1 ring-line';
    }

    updateSummary();
    goToStep(5);

    if (state.payment === 'bank') {
      showToast(t('confirmation.pending'), 'info');
    } else {
      showToast(t('toast.booking'));
    }
  }

  checkinInput.addEventListener('change', () => {
    state.checkin = checkinInput.value;
    const minCheckout = addDaysISO(state.checkin, 1);
    checkoutInput.min = minCheckout;
    if (!checkoutInput.value || checkoutInput.value < minCheckout) {
      checkoutInput.value = minCheckout;
      state.checkout = minCheckout;
    }
    updateSummary();
  });

  checkoutInput.addEventListener('change', () => {
    state.checkout = checkoutInput.value;
    updateSummary();
  });

  guestsSelect.addEventListener('change', () => {
    state.guests = Number(guestsSelect.value);
    updateSummary();
  });

  roomInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) {
        state.roomId = input.value;
        updateSummary();
      }
    });
  });

  mealInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) {
        state.mealId = input.value as MealPlanId;
        updateSummary();
      }
    });
  });

  paymentInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) {
        state.payment = input.value as PaymentMethod;
        updatePaymentPanels();
      }
    });
  });

  qa<HTMLButtonElement>('[data-next]', form).forEach((button) => {
    button.addEventListener('click', () => {
      const target = Number(button.dataset.next);
      if (state.step === 1 && !validateDates()) {
        return;
      }
      if (state.step === 3 && !validateGuestDetails()) {
        return;
      }
      goToStep(target);
    });
  });

  qa<HTMLButtonElement>('[data-back]', form).forEach((button) => {
    button.addEventListener('click', () => {
      goToStep(Number(button.dataset.back));
    });
  });

  qa<HTMLButtonElement>('[data-edit-dates]').forEach((button) => {
    button.addEventListener('click', () => goToStep(1));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (state.step !== 4 || !validatePayment()) {
      return;
    }

    submitButton.disabled = true;
    submitLabel.textContent = t('common.sending');

    await fakeDelay(900);

    submitButton.disabled = false;
    completeBooking();
    updateSummary();
  });

  q<HTMLButtonElement>('[data-add-calendar]', form).addEventListener('click', () => {
    const start = state.checkin.replace(/-/g, '');
    const end = state.checkout.replace(/-/g, '');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Westside Hotel//Booking//EN',
      'BEGIN:VEVENT',
      `UID:${state.reference}@westsidehotel.co.ke`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      'SUMMARY:Westside Hotel stay',
      'LOCATION:12 Jacaranda Lane\\, Westlands\\, Kapenguria',
      `DESCRIPTION:Booking reference ${state.reference}. Front desk +254 20 765 4321.`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `westside-${state.reference.toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  mobileToggle?.addEventListener('click', () => {
    if (!mobileDetails) {
      return;
    }
    const isOpen = mobileDetails.classList.toggle('hidden') === false;
    mobileToggle.setAttribute('aria-expanded', String(isOpen));
    const icon = mobileToggle.querySelector<HTMLElement>('.material-symbols-outlined');
    if (icon) {
      icon.textContent = isOpen ? 'expand_more' : 'expand_less';
    }
  });

  document.addEventListener(LANGUAGE_CHANGE_EVENT, () => {
    updateSummary();
    updateStepLabel();
  });

  updatePaymentPanels();
  updateSummary();
  updateStepLabel();
}
