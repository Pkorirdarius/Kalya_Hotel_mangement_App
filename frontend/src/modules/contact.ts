import { LANGUAGE_CHANGE_EVENT, t } from '../i18n';
import { isValidEmail, isValidKenyanPhone } from '../utils';
import { clearErrors, fakeDelay, setFieldError, showToast } from './ui';

interface ContactState {
  topic: string;
  email: string;
}

function q<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element;
}

export function initContact(): void {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  if (!form) {
    return;
  }

  const wrap = q<HTMLElement>('[data-contact-form-wrap]');
  const success = q<HTMLElement>('[data-contact-success]');
  const summaryEl = q<HTMLElement>('[data-contact-summary]');
  const nameInput = q<HTMLInputElement>('#contact-name', form);
  const emailInput = q<HTMLInputElement>('#contact-email', form);
  const phoneInput = q<HTMLInputElement>('#contact-phone', form);
  const topicInput = q<HTMLSelectElement>('#contact-topic', form);
  const messageInput = q<HTMLTextAreaElement>('#contact-message', form);
  const submitButton = q<HTMLButtonElement>('button[type="submit"]', form);

  const params = new URLSearchParams(window.location.search);
  const requested = params.get('topic');
  if (requested === 'membership' || requested === 'classes') {
    topicInput.value = 'gym';
  } else if (requested && Array.from(topicInput.options).some((option) => option.value === requested)) {
    topicInput.value = requested;
  }

  let state: ContactState = {
    topic: topicInput.value,
    email: '',
  };

  function renderSummary(): void {
    summaryEl.textContent = `${t(`topic.${state.topic}`)} · ${state.email}`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const message = messageInput.value.trim();
    let valid = true;

    if (name.length < 2) {
      setFieldError(nameInput, t('validation.name'));
      valid = false;
    }
    if (!isValidEmail(email)) {
      setFieldError(emailInput, t('validation.email'));
      valid = false;
    }
    if (phone && !isValidKenyanPhone(phone)) {
      setFieldError(phoneInput, t('validation.phone'));
      valid = false;
    }
    if (message.length < 10) {
      setFieldError(messageInput, t('validation.message'));
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

    await fakeDelay(800);

    state = { topic: topicInput.value, email };
    renderSummary();
    wrap.classList.add('hidden');
    success.classList.remove('hidden');
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast(t('toast.formSent'));

    submitButton.disabled = false;
    if (label) {
      label.textContent = originalLabel;
    }
  });

  q<HTMLButtonElement>('[data-contact-again]').addEventListener('click', () => {
    form.reset();
    clearErrors(form);
    state = { topic: 'general', email: '' };
    success.classList.add('hidden');
    wrap.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    nameInput.focus();
  });

  document.addEventListener(LANGUAGE_CHANGE_EVENT, () => {
    if (!success.classList.contains('hidden')) {
      renderSummary();
    }
  });
}
