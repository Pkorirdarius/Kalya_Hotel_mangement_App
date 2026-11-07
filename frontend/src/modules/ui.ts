type ToastTone = 'success' | 'info' | 'error';

const TONE_ICON: Record<ToastTone, string> = {
  success: 'check_circle',
  info: 'info',
  error: 'error',
};

const TONE_CLASSES: Record<ToastTone, string> = {
  success: 'border-forest/20 text-forest',
  info: 'border-gold/40 text-gold-deep',
  error: 'border-red-200 text-red-700',
};

export function showToast(message: string, tone: ToastTone = 'success'): void {
  const region = document.getElementById('toast-region');
  if (!region) {
    return;
  }

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm font-medium shadow-lift ${TONE_CLASSES[tone]}`;
  toast.setAttribute('role', 'status');

  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined text-[20px]';
  icon.textContent = TONE_ICON[tone];

  const text = document.createElement('span');
  text.className = 'pt-0.5';
  text.textContent = message;

  toast.append(icon, text);
  region.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    window.setTimeout(() => toast.remove(), 320);
  }, 4200);
}

export function setFieldError(input: HTMLElement, message: string | null): void {
  const group = input.closest<HTMLElement>('[data-field]');
  const errorEl = group?.querySelector<HTMLElement>('[data-error]');
  if (errorEl) {
    errorEl.textContent = message ?? '';
    errorEl.classList.toggle('hidden', !message);
  }
  input.classList.toggle('!border-red-400', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

export function clearErrors(scope: ParentNode): void {
  scope.querySelectorAll<HTMLElement>('[data-error]').forEach((errorEl) => {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  });
  scope.querySelectorAll<HTMLElement>('input, select, textarea').forEach((input) => {
    input.classList.remove('!border-red-400');
    input.removeAttribute('aria-invalid');
  });
}

export function fakeDelay(ms = 900): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
