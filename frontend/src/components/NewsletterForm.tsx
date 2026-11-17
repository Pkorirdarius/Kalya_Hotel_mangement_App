import { useState, type FormEvent } from 'react';
import { useI18n } from '../i18n-context';
import { useFormGuard } from '../lib/forms/useFormGuard';
import { errorMessage } from '../lib/query/errors';
import { useSubscribeNewsletterMutation } from '../lib/query/hooks';
import { isValidEmail } from '../utils';
import { HoneypotField } from './HoneypotField';
import { useToast } from './ToastProvider';

interface NewsletterFormProps {
  showSuccess?: boolean;
}

export function NewsletterForm({ showSuccess = true }: NewsletterFormProps) {
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const subscribe = useSubscribeNewsletterMutation();
  const { honeypotRef, guardPayload } = useFormGuard();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError(t('validation.email'));
      return;
    }
    setError(null);
    try {
      // The API stores a consent record with the policy version shown at this
      // moment, so a bare frontend-only success would not be auditable.
      await subscribe.mutateAsync({
        email: email.trim(),
        consent: true,
        language,
        source: 'website',
        ...guardPayload(),
      });
      if (showSuccess) {
        setSuccess(true);
      } else {
        showToast(t('toast.newsletter'));
      }
      setEmail('');
    } catch (submitError) {
      setError(errorMessage(submitError, t('newsletter.error')));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur sm:p-7"
      noValidate
    >
      <HoneypotField id="newsletter-website" ref={honeypotRef} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="sr-only" htmlFor="newsletter-email">
            {t('newsletter.emailLabel')}
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (isValidEmail(event.target.value)) {
                setError(null);
              }
            }}
            className={`h-14 w-full rounded-2xl border bg-white/10 px-5 text-sm text-white placeholder:text-white/40 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 ${
              error ? 'border-red-300' : 'border-white/15'
            }`}
            placeholder={t('newsletter.placeholder')}
            aria-invalid={error ? 'true' : 'false'}
          />
          {error ? <p className="mt-2 text-[12px] font-medium text-red-300">{error}</p> : null}
        </div>
        <button
          type="submit"
          disabled={subscribe.isPending}
          className="btn-gold h-14 disabled:cursor-not-allowed disabled:opacity-70 sm:px-7"
        >
          {subscribe.isPending ? t('common.sending') : t('newsletter.button')}
        </button>
      </div>
      {success ? (
        <p
          className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-[13px] font-semibold text-gold"
          role="status"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            check_circle
          </span>
          {t('newsletter.success')}
        </p>
      ) : null}
    </form>
  );
}
