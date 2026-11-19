import { useCallback } from 'react';
import type { NavigateFunction, NavigateOptions, To } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { localizedPath } from './routes';
import { useI18n } from '../i18n-context';
import type { Language } from '../types';

export type LocalizedNavigateFunction = (to: To, options?: NavigateOptions) => void;

export function toLocalizedPath(to: To, language: Language): To {
  if (typeof to !== 'string' || !to.startsWith('/') || to.startsWith('//')) return to;
  const relative = relativeRoutePath(to);
  return localizedPath(relative, language);
}

export function useLocalizedNavigate(): LocalizedNavigateFunction {
  const navigate = useNavigate();
  const { language } = useI18n();
  return useCallback(
    (to: To, options?: NavigateOptions) => navigate(toLocalizedPath(to, language), options),
    [navigate, language],
  );
}
