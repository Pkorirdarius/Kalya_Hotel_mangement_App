import { LANGUAGE_CHANGE_EVENT, getCurrentLanguage, t } from '../i18n';
import { showToast } from './ui';

type RequestStatus = 'open' | 'confirmed' | 'declined';

function qa<T extends Element>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

function formatMinutes(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function initDashboard(): void {
  const cards = qa<HTMLElement>('[data-request]');
  if (cards.length === 0) {
    return;
  }

  const dateEl = document.querySelector<HTMLElement>('[data-dashboard-date]');
  const greetingEl = document.querySelector<HTMLElement>('[data-greeting]');
  const openCountEl = document.querySelector<HTMLElement>('[data-open-requests]');

  function updateDate(): void {
    if (!dateEl) {
      return;
    }
    const now = new Date();
    dateEl.textContent = new Intl.DateTimeFormat(getCurrentLanguage() === 'sw' ? 'sw-KE' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(now);
  }

  function updateGreeting(): void {
    if (!greetingEl) {
      return;
    }
    const hour = new Date().getHours();
    const key = hour < 12 ? 'dash.greeting.morning' : hour < 17 ? 'dash.greeting.afternoon' : 'dash.greeting.evening';
    greetingEl.textContent = t(key);
  }

  function updateOpenCount(): void {
    if (!openCountEl) {
      return;
    }
    const open = cards.filter((card) => (card.dataset.status ?? 'open') === 'open').length;
    openCountEl.textContent = String(open);
  }

  function setStatus(card: HTMLElement, status: RequestStatus): void {
    const chip = card.querySelector<HTMLElement>('[data-request-status]');
    if (!chip) {
      return;
    }
    card.dataset.status = status;
    chip.className =
      status === 'confirmed'
        ? 'pill bg-forest-50 text-forest'
        : status === 'declined'
          ? 'pill bg-red-50 text-red-600'
          : 'pill bg-gold-soft text-gold-deep';
    chip.removeAttribute('data-i18n');
    chip.textContent = t(status === 'confirmed' ? 'request.confirmed' : status === 'declined' ? 'request.declined' : 'request.open');
  }

  cards.forEach((card) => {
    card.dataset.status = 'open';
    const minutes = Number(card.querySelector<HTMLElement>('[data-countdown]')?.dataset.minutes ?? '10');
    const deadline = Date.now() + minutes * 60_000;
    card.dataset.deadline = String(deadline);

    card.querySelector<HTMLButtonElement>('[data-request-confirm]')?.addEventListener('click', () => {
      card.dataset.resolved = '1';
      setStatus(card, 'confirmed');
      const countdown = card.querySelector<HTMLElement>('[data-countdown]');
      const text = countdown?.querySelector<HTMLElement>('[data-countdown-text]');
      if (countdown && text) {
        countdown.className = 'inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-2.5 py-1 text-[11px] font-bold text-forest';
        text.textContent = t('dash.resolved');
      }
      card.querySelector<HTMLElement>('[data-request-actions]')?.remove();
      card.classList.add('ring-2', 'ring-forest/15');
      updateOpenCount();
      showToast(t('toast.requestConfirmed'));
    });

    card.querySelector<HTMLButtonElement>('[data-request-decline]')?.addEventListener('click', () => {
      card.dataset.resolved = '1';
      setStatus(card, 'declined');
      const countdown = card.querySelector<HTMLElement>('[data-countdown]');
      if (countdown) {
        countdown.className = 'inline-flex items-center gap-1.5 rounded-full bg-sand px-2.5 py-1 text-[11px] font-bold text-muted';
        const text = countdown.querySelector<HTMLElement>('[data-countdown-text]');
        if (text) {
          text.textContent = t('dash.closed');
        }
      }
      card.querySelector<HTMLElement>('[data-request-actions]')?.remove();
      card.classList.add('opacity-60');
      updateOpenCount();
      showToast(t('toast.requestDeclined'), 'info');
    });
  });

  function tick(): void {
    cards.forEach((card) => {
      if (card.dataset.resolved === '1') {
        return;
      }
      const deadline = Number(card.dataset.deadline ?? '0');
      const remaining = deadline - Date.now();
      const countdown = card.querySelector<HTMLElement>('[data-countdown]');
      const text = countdown?.querySelector<HTMLElement>('[data-countdown-text]');
      if (!countdown || !text) {
        return;
      }
      if (remaining <= 0) {
        countdown.className = 'inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700';
        text.textContent = t('request.overdue');
        return;
      }
      text.textContent = formatMinutes(remaining);
      if (remaining <= 10 * 60_000) {
        countdown.className = 'inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600';
      } else {
        countdown.className = 'inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700';
      }
    });
  }

  function renderResolvedStatuses(): void {
    cards.forEach((card) => {
      const status = card.dataset.status as RequestStatus | undefined;
      if (status === 'confirmed' || status === 'declined') {
        const chip = card.querySelector<HTMLElement>('[data-request-status]');
        if (chip) {
          chip.textContent = t(status === 'confirmed' ? 'request.confirmed' : 'request.declined');
        }
        const text = card.querySelector<HTMLElement>('[data-countdown-text]');
        if (text) {
          text.textContent = status === 'confirmed' ? t('dash.resolved') : t('dash.closed');
        }
      }
    });
    updateOpenCount();
  }

  const refreshButton = document.querySelector<HTMLButtonElement>('[data-dashboard-refresh]');
  refreshButton?.addEventListener('click', () => {
    window.location.reload();
  });

  const resolvedTime = (): void => {
    updateDate();
    updateGreeting();
    renderResolvedStatuses();
  };

  document.addEventListener(LANGUAGE_CHANGE_EVENT, resolvedTime);

  updateDate();
  updateGreeting();
  updateOpenCount();
  tick();
  window.setInterval(tick, 1000);
}
