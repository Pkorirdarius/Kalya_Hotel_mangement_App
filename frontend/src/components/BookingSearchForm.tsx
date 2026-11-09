import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n-context';
import { addDaysISO, nightsBetween, todayISO } from '../utils';

export function BookingSearchForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const today = todayISO();
  const [checkin, setCheckin] = useState(addDaysISO(today, 7));
  const [checkout, setCheckout] = useState(addDaysISO(addDaysISO(today, 7), 2));
  const [guests, setGuests] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const syncCheckout = (value: string) => {
    setCheckin(value);
    setError(null);
    const minCheckout = addDaysISO(value || today, 1);
    if (!checkout || checkout < minCheckout) {
      setCheckout(minCheckout);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nights = nightsBetween(checkin, checkout);
    if (!checkin || nights < 1) {
      setError(t('validation.dates'));
      return;
    }
    navigate(`/booking?checkin=${checkin}&checkout=${checkout}&guests=${guests}`);
  };

  return (
    <section
      className="relative z-20 -mt-20 px-0 md:-mt-24"
      aria-label={t('common.checkAvailability')}
    >
      <div className="container-page">
        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-white/70 bg-white p-4 shadow-lift sm:p-5 lg:p-6"
          noValidate
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-[12px] font-semibold text-forest">
              <span className="material-symbols-outlined text-[18px] text-gold-deep" aria-hidden="true">
                verified
              </span>
              <span>{t('booking.bestRate')}</span>
            </p>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              <span className="material-symbols-outlined text-[16px] text-forest" aria-hidden="true">
                event_available
              </span>
              <span>{t('booking.freeCancelShort')}</span>
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <label className="field-label" htmlFor="search-checkin">
                {t('booking.checkin')}
              </label>
              <input
                id="search-checkin"
                name="checkin"
                type="date"
                required
                min={today}
                value={checkin}
                onChange={(event) => syncCheckout(event.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="search-checkout">
                {t('booking.checkout')}
              </label>
              <input
                id="search-checkout"
                name="checkout"
                type="date"
                required
                min={addDaysISO(checkin || today, 1)}
                value={checkout}
                onChange={(event) => {
                  setCheckout(event.target.value);
                  setError(null);
                }}
                className={`field ${error ? '!border-red-400' : ''}`}
                aria-invalid={error ? 'true' : 'false'}
              />
              {error ? <p className="mt-1.5 text-[12px] font-medium text-red-600">{error}</p> : null}
            </div>
            <div>
              <label className="field-label" htmlFor="search-guests">
                {t('booking.guests')}
              </label>
              <select
                id="search-guests"
                name="guests"
                className="field field-select"
                value={guests}
                onChange={(event) => setGuests(Number(event.target.value))}
              >
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {t(`booking.guest${count}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-gold w-full whitespace-nowrap lg:w-auto">
                <span>{t('common.checkAvailability')}</span>
                <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
