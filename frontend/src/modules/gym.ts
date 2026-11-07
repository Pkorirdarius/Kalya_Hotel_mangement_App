import { t } from '../i18n';
import { isValidKenyanPhone, todayISO } from '../utils';
import { clearErrors, fakeDelay, setFieldError, showToast } from './ui';

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

export function initGym(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-gym-dialog]');
  if (!dialog) {
    return;
  }

  const form = q<HTMLFormElement>('[data-gym-form]', dialog);
  const nameInput = q<HTMLInputElement>('#gym-name', form);
  const phoneInput = q<HTMLInputElement>('#gym-phone', form);
  const dateInput = q<HTMLInputElement>('#gym-date', form);
  const submitButton = q<HTMLButtonElement>('button[type="submit"]', form);
  const today = todayISO();
  dateInput.min = today;
  dateInput.value = today;

  function openDialog(): void {
    clearErrors(form);
    dateInput.min = today;
    if (!dateInput.value || dateInput.value < today) {
      dateInput.value = today;
    }
    dialog!.showModal();
    window.setTimeout(() => nameInput.focus(), 80);
  }

  qa<HTMLButtonElement>('[data-gym-open]').forEach((button) => {
    button.addEventListener('click', openDialog);
  });

  qa<HTMLButtonElement>('[data-gym-close]').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const date = dateInput.value;
    let valid = true;

    if (name.length < 2) {
      setFieldError(nameInput, t('validation.name'));
      valid = false;
    }
    if (!isValidKenyanPhone(phone)) {
      setFieldError(phoneInput, t('validation.phone'));
      valid = false;
    }
    if (!date || date < today) {
      setFieldError(dateInput, t('validation.date'));
      valid = false;
    }

    if (!valid) {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    submitButton.disabled = true;
    await fakeDelay(700);
    submitButton.disabled = false;
    dialog.close();
    showToast(t('toast.dayPass'));
    form.reset();
    dateInput.min = today;
    dateInput.value = today;
  });
}
