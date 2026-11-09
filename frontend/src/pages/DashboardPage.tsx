import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../components/Page';
import { useToast } from '../components/ToastProvider';
import { useI18n } from '../i18n-context';
import { PHONE_HREF } from '../lib/constants';

type RequestStatus = 'open' | 'confirmed' | 'declined';

interface RequestItem {
  id: string;
  roomKey: string;
  titleKey: string;
  descKey: string;
  minutes: number;
}

const REQUESTS: RequestItem[] = [
  { id: 'pillows', roomKey: 'dash.request.pillows.room', titleKey: 'dash.request.pillows.title', descKey: 'dash.request.pillows.desc', minutes: 6 },
  { id: 'late-checkout', roomKey: 'dash.request.late.room', titleKey: 'dash.request.late.title', descKey: 'dash.request.late.desc', minutes: 11 },
  { id: 'transfer', roomKey: 'dash.request.transfer.room', titleKey: 'dash.request.transfer.title', descKey: 'dash.request.transfer.desc', minutes: 22 },
];

const ARRIVALS = [
  { name: 'Grace Wanjiku', roomKey: 'room.deluxe.name', guests: 2, time: '10:30', status: 'status.expected' },
  { name: 'Daniel Otieno', roomKey: 'room.standard.name', guests: 1, time: '12:00', status: 'status.expected' },
  { name: 'Amina Yusuf', roomKey: 'room.mara.name', guests: 3, time: '14:15', status: 'status.checkedIn' },
  { name: 'Peter Mwangi', roomKey: 'room.standard.name', guests: 1, time: '16:00', status: 'status.late' },
];

const ROOMS = [
  { key: 'dash.rooms.clean', value: '24 / 34', width: '71%', bar: 'bg-forest' },
  { key: 'dash.rooms.dirty', value: '8 / 34', width: '24%', bar: 'bg-gold' },
  { key: 'dash.rooms.out', value: '2 / 34', width: '6%', bar: 'bg-red-400' },
];

function formatMinutes(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function DashboardPage() {
  const { t, language, toggleLanguage } = useI18n();
  const { showToast } = useToast();
  const [now, setNow] = useState(() => Date.now());
  const [statuses, setStatuses] = useState<Record<string, RequestStatus>>({});
  const [deadlines] = useState<Record<string, number>>(() => {
    const started = Date.now();
    return Object.fromEntries(REQUESTS.map((item) => [item.id, started + item.minutes * 60_000]));
  });

  usePageMeta('Front Desk Dashboard — West Premier Hotel');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dateLabel = new Intl.DateTimeFormat(language === 'sw' ? 'sw-KE' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(now));

  const hour = new Date(now).getHours();
  const greeting = t(hour < 12 ? 'dash.greeting.morning' : hour < 17 ? 'dash.greeting.afternoon' : 'dash.greeting.evening');
  const openCount = REQUESTS.filter((item) => (statuses[item.id] ?? 'open') === 'open').length;

  const resolve = (item: RequestItem, status: Exclude<RequestStatus, 'open'>) => {
    setStatuses((current) => ({ ...current, [item.id]: status }));
    showToast(t(status === 'confirmed' ? 'toast.requestConfirmed' : 'toast.requestDeclined'), status === 'confirmed' ? 'success' : 'info');
  };

  return (
    <div className="min-h-screen bg-[#071a14]">
      <main className="min-h-screen">
        <header className="border-b border-white/10 bg-forest-dark">
          <div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center justify-between gap-4 px-4 lg:px-8">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2.5" aria-label={t('common.homeLabel')}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                  <span className="font-serif text-xl text-gold">K</span>
                </span>
                <span className="hidden flex-col leading-none sm:flex">
                  <span className="font-serif text-[22px] text-white">West Premier</span>
                  <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.28em] text-white/50">
                    {t('dash.frontDesk')}
                  </span>
                </span>
              </Link>
              <div className="hidden h-8 w-px bg-white/10 md:block" />
              <div className="hidden items-center gap-2 md:flex">
                <span className="h-2 w-2 animate-gentle-pulse rounded-full bg-[#3DDC84]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">{t('dash.live')}</span>
                <span className="text-[11px] text-white/40">{dateLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={toggleLanguage}
                aria-label={t('header.language')}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white/[0.08] px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white ring-1 ring-white/10 transition hover:bg-white/[0.12]"
              >
                <span className={language === 'en' ? 'text-gold' : 'text-white/60'}>EN</span>
                <span className="text-white/30">|</span>
                <span className={language === 'sw' ? 'text-gold' : 'text-white/60'}>SW</span>
              </button>
              <Link
                to="/"
                className="hidden min-h-[40px] items-center gap-1.5 rounded-full border border-white/15 px-3 text-[11px] font-semibold text-white/70 transition hover:text-white sm:inline-flex"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  open_in_new
                </span>
                <span>{t('dash.viewSite')}</span>
              </Link>
              <div className="flex items-center gap-2.5 rounded-full bg-white/[0.08] py-1 pl-1 pr-3 ring-1 ring-white/10">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-[11px] font-extrabold text-forest-dark">
                  AW
                </span>
                <span className="hidden flex-col leading-tight sm:flex">
                  <span className="text-[11px] font-bold text-white">Amina W.</span>
                  <span className="text-[9px] text-white/50">{t('dash.frontDesk')}</span>
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-8 lg:py-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{t('dash.eyebrow')}</p>
              <h1 className="mt-2 font-serif text-3xl text-white sm:text-4xl">{greeting}, Amina.</h1>
              <p className="mt-1 text-sm text-white/50">{t('dash.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[42px] items-center gap-2 self-start rounded-full border border-white/15 px-4 text-[12px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white sm:self-auto"
            >
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                refresh
              </span>
              <span>{t('dash.refresh')}</span>
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { key: 'arrivals', value: '14', note: 'dash.stats.arrivalsNote', icon: 'login' },
              { key: 'departures', value: '9', note: 'dash.stats.departuresNote', icon: 'logout' },
              { key: 'inHouse', value: '38', note: 'dash.stats.inHouseNote', icon: 'hotel' },
            ].map((stat) => (
              <div key={stat.key} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                    {t(`dash.stats.${stat.key}`)}
                  </p>
                  <span className="material-symbols-outlined text-[18px] text-gold" aria-hidden="true">
                    {stat.icon}
                  </span>
                </div>
                <p className="mt-2 font-serif text-4xl text-white">{stat.value}</p>
                <p className="mt-0.5 text-[10px] text-white/40">{t(stat.note)}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">{t('dash.stats.requests')}</p>
                <span className="material-symbols-outlined text-[18px] text-gold" aria-hidden="true">
                  notifications_active
                </span>
              </div>
              <p className="mt-2 font-serif text-4xl text-white">{openCount}</p>
              <p className="mt-0.5 text-[10px] text-gold/70">{t('dash.stats.requestsNote')}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                    {t('dash.requests.eyebrow')}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl text-white">{t('dash.requests.title')}</h2>
                </div>
                <p className="hidden max-w-xs text-right text-[11px] leading-relaxed text-white/40 sm:block">
                  {t('dash.requests.text')}
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                {REQUESTS.map((item) => {
                  const status = statuses[item.id] ?? 'open';
                  const resolved = status !== 'open';
                  const remaining = deadlines[item.id] - now;
                  const overdue = remaining <= 0;
                  const urgent = remaining <= 10 * 60_000;

                  return (
                    <article
                      key={item.id}
                      className={`rounded-2xl border border-white/10 bg-white p-4 shadow-soft transition ${
                        status === 'confirmed' ? 'ring-2 ring-forest/15' : ''
                      } ${status === 'declined' ? 'opacity-60' : ''}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="pill bg-forest-50 text-forest">{t(item.roomKey)}</span>
                          <span
                            className={`pill ${
                              status === 'confirmed'
                                ? 'bg-forest-50 text-forest'
                                : status === 'declined'
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-gold-soft text-gold-deep'
                            }`}
                          >
                            {t(status === 'confirmed' ? 'request.confirmed' : status === 'declined' ? 'request.declined' : 'request.open')}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            resolved
                              ? status === 'confirmed'
                                ? 'bg-forest-50 text-forest'
                                : 'bg-sand text-muted'
                              : overdue
                                ? 'bg-red-100 text-red-700'
                                : urgent
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                            timer
                          </span>
                          <span>
                            {resolved
                              ? t(status === 'confirmed' ? 'dash.resolved' : 'dash.closed')
                              : overdue
                                ? t('request.overdue')
                                : formatMinutes(remaining)}
                          </span>
                        </span>
                      </div>
                      <h3 className="mt-3 text-[15px] font-bold text-forest-dark">{t(item.titleKey)}</h3>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted">{t(item.descKey)}</p>
                      {!resolved ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" className="btn-primary btn-sm" onClick={() => resolve(item, 'confirmed')}>
                            {t('dash.confirm')}
                          </button>
                          <button type="button" className="btn-outline btn-sm" onClick={() => resolve(item, 'declined')}>
                            {t('dash.decline')}
                          </button>
                          <a
                            href={PHONE_HREF}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-forest transition hover:bg-forest-50"
                          >
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                              call
                            </span>
                            <span>{t('dash.call')}</span>
                          </a>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="grid gap-5">
              <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                      {t('dash.arrivals.eyebrow')}
                    </p>
                    <h2 className="mt-1 text-[17px] font-bold text-forest-dark">{t('dash.arrivals.title')}</h2>
                  </div>
                  <span className="pill bg-forest-50 text-forest">14</span>
                </div>
                <div className="mt-4 space-y-3">
                  {ARRIVALS.map((guest, index) => (
                    <div
                      key={guest.name}
                      className={`flex items-center justify-between gap-3 ${
                        index === ARRIVALS.length - 1 ? '' : 'border-b border-line pb-3'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-ink">{guest.name}</p>
                        <p className="text-[11px] text-muted">
                          {t(guest.roomKey)} · {guest.guests}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-forest">{guest.time}</p>
                        <span
                          className={`pill mt-1 ${
                            guest.status === 'status.checkedIn'
                              ? 'bg-forest-50 text-forest'
                              : guest.status === 'status.late'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-gold-soft text-gold-deep'
                          }`}
                        >
                          {t(guest.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="link-arrow mt-4 text-[12px]">
                  <span>{t('dash.arrivals.all')}</span>
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              </section>

              <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{t('dash.rooms.eyebrow')}</p>
                <h2 className="mt-1 text-[17px] font-bold text-forest-dark">{t('dash.rooms.title')}</h2>
                <div className="mt-4 space-y-3">
                  {ROOMS.map((room) => (
                    <div key={room.key}>
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className={room.key === 'dash.rooms.clean' ? 'text-forest' : room.key === 'dash.rooms.dirty' ? 'text-gold-deep' : 'text-red-600'}>
                          {t(room.key)}
                        </span>
                        <span className="text-muted">{room.value}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand">
                        <div className={`h-full rounded-full ${room.bar}`} style={{ width: room.width }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-cream p-3 text-[11px] leading-relaxed text-muted">
                  <span className="material-symbols-outlined text-[16px] text-gold-deep" aria-hidden="true">
                    cleaning_services
                  </span>
                  <span>{t('dash.rooms.note')}</span>
                </p>
              </section>
            </aside>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-[10px] text-white/30">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              lock
            </span>
            <span>{t('dash.footer')}</span>
          </p>
        </div>
      </main>
    </div>
  );
}
