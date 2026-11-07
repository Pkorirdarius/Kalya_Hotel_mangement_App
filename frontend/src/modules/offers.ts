import { LANGUAGE_CHANGE_EVENT, getCurrentLanguage, t } from '../i18n';

interface ActiveArticle {
  titleKey: string;
  tagKey: string;
  bodyKey: string;
  image: string;
  ctaHref: string | null;
  ctaLabelKey: string | null;
}

const FILTER_ACTIVE = ['bg-forest', 'text-white'];
const FILTER_IDLE = ['bg-white', 'text-muted', 'ring-1', 'ring-line', 'hover:text-forest'];

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

export function initOffers(): void {
  const cards = qa<HTMLElement>('[data-offer-card]');
  const filterButtons = qa<HTMLButtonElement>('[data-offer-filter]');
  const empty = document.querySelector<HTMLElement>('[data-offer-empty]');
  const dialog = document.querySelector<HTMLDialogElement>('[data-article-dialog]');

  function formatDates(): void {
    const language = getCurrentLanguage() === 'sw' ? 'sw-KE' : 'en-GB';
    qa<HTMLTimeElement>('[data-offer-date]').forEach((time) => {
      const iso = time.dateTime;
      if (!iso) {
        return;
      }
      const date = new Date(`${iso}T12:00:00`);
      if (!Number.isNaN(date.getTime())) {
        time.textContent = new Intl.DateTimeFormat(language, { month: 'short', year: 'numeric' }).format(date);
      }
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.offerFilter ?? 'all';

      filterButtons.forEach((item) => {
        const active = item === button;
        item.setAttribute('aria-pressed', active ? 'true' : 'false');
        FILTER_ACTIVE.forEach((className) => item.classList.toggle(className, active));
        FILTER_IDLE.forEach((className) => item.classList.toggle(className, !active));
        if (!active) {
          item.classList.add('ring-1', 'ring-line');
        }
      });

      let visible = 0;
      cards.forEach((card) => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hidden', !show);
        if (show) {
          visible += 1;
        }
      });

      empty?.classList.toggle('hidden', visible > 0);
    });
  });

  if (!dialog) {
    formatDates();
    return;
  }

  const image = q<HTMLImageElement>('[data-article-dialog-image]', dialog);
  const tag = q<HTMLElement>('[data-article-dialog-tag]', dialog);
  const title = q<HTMLElement>('[data-article-dialog-title]', dialog);
  const body = q<HTMLElement>('[data-article-dialog-body]', dialog);
  const cta = q<HTMLAnchorElement>('[data-article-dialog-cta]', dialog);
  let active: ActiveArticle | null = null;

  function renderDialog(): void {
    if (!active) {
      return;
    }
    tag.textContent = t(active.tagKey);
    title.textContent = t(active.titleKey);
    body.textContent = t(active.bodyKey);
    image.src = active.image;
    image.alt = t(active.titleKey);

    if (active.ctaHref && active.ctaLabelKey) {
      cta.href = active.ctaHref;
      cta.textContent = t(active.ctaLabelKey);
      cta.classList.remove('hidden');
    } else {
      cta.classList.add('hidden');
    }
  }

  function openArticle(source: HTMLElement): void {
    const card = source.closest<HTMLElement>('[data-offer-card]');
    const data = card ?? source;
    const titleKey = data.dataset.articleTitle;
    if (!titleKey) {
      return;
    }
    active = {
      titleKey,
      tagKey: data.dataset.articleTag ?? 'offers.stories.eyebrow',
      bodyKey: data.dataset.articleBody ?? '',
      image: data.dataset.articleImage ?? '',
      ctaHref: data.dataset.ctaHref ?? null,
      ctaLabelKey: data.dataset.ctaLabel ?? null,
    };
    renderDialog();
    dialog!.showModal();
  }

  qa<HTMLElement>('[data-article-open]').forEach((button) => {
    button.addEventListener('click', () => openArticle(button));
  });

  qa<HTMLButtonElement>('[data-article-close]', dialog).forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  document.addEventListener(LANGUAGE_CHANGE_EVENT, () => {
    formatDates();
    if (dialog.open) {
      renderDialog();
    }
  });

  formatDates();
}
