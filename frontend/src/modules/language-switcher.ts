import type { Language, LanguageChangeDetail } from '../types';

const SWITCH_SELECTOR = '[aria-label="Language switch"]';
const STORAGE_KEY = 'westside.language';

export const LANGUAGE_CHANGE_EVENT = 'westside:languagechange';

const EN_LABEL = 'EN';
const SW_LABEL = 'SW';

const ACTIVE_LABEL_CLASSES = ['text-primary', 'font-bold'] as const;
const INACTIVE_LABEL_CLASSES = ['text-on-surface-variant', 'font-normal'] as const;

function readStoredLanguage(): Language | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'en' || stored === 'sw' ? stored : null;
  } catch {
    return null;
  }
}

function storeLanguage(language: Language): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage can be unavailable in private browsing; the switcher still works for the session.
  }
}

function getLanguageLabels(button: HTMLButtonElement): Record<Language, HTMLSpanElement | null> {
  const spans = Array.from(button.querySelectorAll<HTMLSpanElement>('span'));

  const findLabel = (label: string): HTMLSpanElement | null =>
    spans.find((span) => span.textContent?.trim() === label) ?? null;

  return {
    en: findLabel(EN_LABEL),
    sw: findLabel(SW_LABEL),
  };
}

function paintLabel(label: HTMLSpanElement | null, active: boolean): void {
  if (!label) {
    return;
  }

  if (active) {
    label.classList.remove(...INACTIVE_LABEL_CLASSES);
    label.classList.add(...ACTIVE_LABEL_CLASSES);
  } else {
    label.classList.remove(...ACTIVE_LABEL_CLASSES);
    label.classList.add(...INACTIVE_LABEL_CLASSES);
  }
}

function applyLanguage(button: HTMLButtonElement, language: Language, notify: boolean): void {
  const labels = getLanguageLabels(button);

  paintLabel(labels.en, language === 'en');
  paintLabel(labels.sw, language === 'sw');

  document.documentElement.lang = language;
  storeLanguage(language);

  if (notify) {
    const detail: LanguageChangeDetail = { language };
    document.dispatchEvent(new CustomEvent<LanguageChangeDetail>(LANGUAGE_CHANGE_EVENT, { detail }));
  }
}

/**
 * Makes the EN | SW control functional. The Django backend will supply the
 * translated content; this module owns the toggle state and emits a
 * `westside:languagechange` event so server-rendered pages can react.
 */
export function initLanguageSwitcher(): void {
  const button = document.querySelector<HTMLButtonElement>(SWITCH_SELECTOR);

  if (!button) {
    return;
  }

  const initialLanguage: Language =
    readStoredLanguage() ?? (document.documentElement.lang === 'sw' ? 'sw' : 'en');

  applyLanguage(button, initialLanguage, false);

  button.addEventListener('click', () => {
    const currentLanguage: Language = document.documentElement.lang === 'sw' ? 'sw' : 'en';
    const nextLanguage: Language = currentLanguage === 'en' ? 'sw' : 'en';

    applyLanguage(button, nextLanguage, true);
  });
}
