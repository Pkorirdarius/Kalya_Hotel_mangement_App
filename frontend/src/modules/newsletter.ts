import { t } from '../i18n';
import { isValidEmail } from '../utils';
import { setFieldError, showToast } from './ui';

export function initNewsletterForms(): void {
  document.querySelectorAll<HTMLFormElement>('[data-newsletter-form]').forEach((form) => {
    const input = form.querySelector<HTMLInputElement>('input[type="email"]');
    const success = form.querySelector<HTMLElement>('[data-newsletter-success]');

    if (!input) {
      return;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!isValidEmail(input.value)) {
        setFieldError(input, t('validation.email'));
        input.focus();
        return;
      }

      setFieldError(input, null);

      if (success) {
        success.textContent = t('newsletter.success');
        success.classList.remove('hidden');
        success.classList.add('flex');
      } else {
        showToast(t('toast.newsletter'));
      }

      form.reset();
    });

    input.addEventListener('input', () => {
      if (input.value && isValidEmail(input.value)) {
        setFieldError(input, null);
      }
    });
  });
}
