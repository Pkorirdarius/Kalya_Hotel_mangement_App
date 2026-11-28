import type { LinkProps } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom';
import { toLocalizedPath } from '../lib/localizedRouting';
import { useI18n } from '../i18n-context';

export type LocalizedLinkProps = Omit<LinkProps, 'to'> & { to: LinkProps['to'] };

export function LocalizedLink({ to, ...props }: LocalizedLinkProps) {
  const { language } = useI18n();
  return <RouterLink {...props} to={toLocalizedPath(to, language)} />;
}

export { LocalizedLink as Link };
