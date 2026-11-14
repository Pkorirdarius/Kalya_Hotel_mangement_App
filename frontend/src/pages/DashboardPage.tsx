import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { usePageMeta } from '../components/Page';
import { useToast } from '../components/ToastProvider';
import { HOTEL } from '../config/hotel';
import { useI18n } from '../i18n-context';
import { ApiError } from '../lib/api/client';
import type {
  ActivityRow,
  DeskAction,
  DeskActionRequest,
  QueueItem,
  User,
} from '../lib/api/types';
import {
  useEscalateOverdueMutation,
  useFrontDeskActionMutation,
  useFrontDeskActivity,
  useFrontDeskQueue,
  useStaffLoginMutation,
  useStaffLogoutMutation,
  useStaffMe,
} from '../lib/query/hooks';

interface RecentAction {
  action: DeskAction;
  item: QueueItem;
}

const PAYMENT_KEY: Record<string, string> = {
  unpaid: 'dash.payment.unpaid',
  pending: 'dash.payment.pending',
  initiated: 'dash.payment.initiated',
  paid: 'dash.payment.paid',
  succeeded: 'dash.payment.succeeded',
  failed: 'dash.payment.failed',
  cancelled: 'dash.payment.cancelled',
  refunded: 'dash.payment.refunded',
};

const ACTION_KEY: Record<string, string> = {
  confirm: 'dash.activity.confirm',
  decline: 'dash.activity.decline',
  undo: 'dash.activity.undo',
};

function localeFor(language: string): string {
  return language === 'sw' ? 'sw-KE' : 'en-GB';
}

function formatCountdown(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function parseTime(iso: string): number {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function secondsUntil(iso: string, now: number): number {
  const target = parseTime(iso);
  if (!target) return 0;
  return Math.max(0, Math.ceil((target - now) / 1000));
}

function formatClock(iso: string, language: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(localeFor(language), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatStamp(iso: string, language: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(localeFor(language), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function displayName(user: User): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return full || user.username;
}

function initialsFor(user: User): string {
  const first = user.first_name?.trim()?.[0] ?? '';
  const last = user.last_name?.trim()?.[0] ?? '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || user.username.slice(0, 2).toUpperCase();
}

function itemKey(item: Pick<QueueItem, 'entity_type' | 'id'>): string {
  return `${item.entity_type}:${item.id}`;
}

function BrandHeader({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="border-b border-white/10 bg-forest-dark">
      <div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center justify-between gap-4 px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label={t('common.homeLabel')}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            <span className="font-serif text-xl text-gold">{HOTEL.monogram}</span>
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-serif text-[22px] text-white">{HOTEL.shortName}</span>
            <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.28em] text-white/50">
              {t('dash.frontDesk')}
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">{children}</div>
      </div>
    </header>
  );
}

function LanguageButton() {
  const { t, language, toggleLanguage } = useI18n();
  return (
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
  );
}

function ViewSiteLink() {
  const { t } = useI18n();
  return (
    <Link
      to="/"
      className="hidden min-h-[40px] items-center gap-1.5 rounded-full border border-white/15 px-3 text-[11px] font-semibold text-white/70 transition hover:text-white sm:inline-flex"
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        open_in_new
      </span>
      <span>{t('dash.viewSite')}</span>
    </Link>
  );
}

function LoadingScreen() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-[#071a14]">
      <BrandHeader>
        <LanguageButton />
      </BrandHeader>
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-gold" />
          <p className="text-sm text-white/60">{t('dash.login.loading')}</p>
        </div>
      </main>
    </div>
  );
}

function LoginScreen() {
  const { t } = useI18n();
  const login = useStaffLoginMutation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const errorMessage =
    login.error instanceof ApiError
      ? login.error.message
      : login.isError
        ? t('dash.login.error')
        : null;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password) return;
    login.mutate({ username: username.trim(), password });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#071a14]">
      <BrandHeader>
        <LanguageButton />
        <ViewSiteLink />
      </BrandHeader>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-lift backdrop-blur sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/25">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
              badge
            </span>
          </span>
          <h1 className="mt-5 font-serif text-3xl text-white">{t('dash.login.title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">{t('dash.login.subtitle')}</p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label
                htmlFor="staff-username"
                className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/55"
              >
                {t('dash.login.username')}
              </label>
              <input
                id="staff-username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  if (login.isError) login.reset();
                }}
                className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.08] px-4 text-[15px] text-white placeholder:text-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
            </div>
            <div>
              <label
                htmlFor="staff-password"
                className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/55"
              >
                {t('dash.login.password')}
              </label>
              <input
                id="staff-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (login.isError) login.reset();
                }}
                className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.08] px-4 text-[15px] text-white placeholder:text-white/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
            </div>

            {errorMessage ? (
              <p
                role="alert"
                className="rounded-xl border border-red-300/30 bg-red-500/10 px-3 py-2 text-[12px] leading-relaxed text-red-200"
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={login.isPending || !username.trim() || !password}
              className="btn-gold w-full"
            >
              {login.isPending ? t('dash.login.submitting') : t('dash.login.submit')}
            </button>
          </form>

          <p className="mt-5 text-[11px] leading-relaxed text-white/35">{t('dash.login.note')}</p>
        </section>
      </main>
      <footer className="border-t border-white/5 py-4 text-center text-[10px] text-white/25">
        {HOTEL.name}
      </footer>
    </div>
  );
}

export function DashboardPage() {
  const { t } = useI18n();
  const staff = useStaffMe();
  usePageMeta(t('meta.dashboard.title'));

  if (staff.isPending) {
    return <LoadingScreen />;
  }

  const user = staff.data?.user;
  if (!user) {
    return <LoginScreen />;
  }

  return <FrontDeskBoard user={user} />;
}

function FrontDeskBoard({ user }: { user: User }) {
  const { t, language, formatMoney } = useI18n();
  const { showToast } = useToast();
  const [now, setNow] = useState(() => Date.now());
  const [lastAction, setLastAction] = useState<RecentAction | null>(null);
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(() => new Set());

  const queue = useFrontDeskQueue({ poll: true });
  const activity = useFrontDeskActivity(12);
  const actionMutation = useFrontDeskActionMutation();
  const escalateMutation = useEscalateOverdueMutation();
  const logoutMutation = useStaffLogoutMutation();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const items = useMemo(
    () => (queue.data?.items ?? []).filter((item) => !hiddenItems.has(itemKey(item))),
    [queue.data?.items, hiddenItems],
  );

  const overdueCount = items.filter((item) => secondsUntil(item.deadline_at, now) <= 0).length;
  const oldestSeconds = items.reduce((longest, item) => {
    const created = parseTime(item.created_at);
    if (!created) return longest;
    return Math.max(longest, Math.max(0, Math.floor((now - created) / 1000)));
  }, 0);

  const targetMinutes = queue.data?.target_minutes ?? 10;
  const escalateMinutes = queue.data?.escalate_minutes ?? 8;
  const undoSecondsLeft =
    lastAction?.action.undo_deadline != null
      ? secondsUntil(lastAction.action.undo_deadline, now)
      : 0;
  const showUndo = Boolean(lastAction && undoSecondsLeft > 0);

  const hour = new Date(now).getHours();
  const greeting = t(
    hour < 12 ? 'dash.greeting.morning' : hour < 17 ? 'dash.greeting.afternoon' : 'dash.greeting.evening',
  );
  const dateLabel = new Intl.DateTimeFormat(localeFor(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(now));

  const busyItem = actionMutation.isPending ? actionMutation.variables : undefined;

  const handleAction = async (item: QueueItem, action: 'confirm' | 'decline') => {
    try {
      const result = await actionMutation.mutateAsync({
        entity_type: item.entity_type as DeskActionRequest['entity_type'],
        entity_id: item.id,
        action,
      });
      setHiddenItems((current) => new Set(current).add(itemKey(item)));
      setLastAction({ action: result, item });
      showToast(
        t(action === 'confirm' ? 'dash.undo.confirmed' : 'dash.undo.declined'),
        action === 'confirm' ? 'success' : 'info',
      );
    } catch {
      showToast(t('dash.queue.actionError'), 'error');
    }
  };

  const handleUndo = async () => {
    if (!lastAction) return;
    try {
      await actionMutation.mutateAsync({
        entity_type: lastAction.item.entity_type as DeskActionRequest['entity_type'],
        entity_id: lastAction.item.id,
        action: 'undo',
      });
      setHiddenItems((current) => {
        const next = new Set(current);
        next.delete(itemKey(lastAction.item));
        return next;
      });
      setLastAction(null);
      showToast(t('dash.undo.toast'), 'success');
    } catch {
      showToast(t('dash.undo.error'), 'error');
    }
  };

  const handleEscalate = async () => {
    try {
      const result = await escalateMutation.mutateAsync();
      showToast(
        result.escalated > 0
          ? t('dash.escalate.result', { count: result.escalated })
          : t('dash.escalate.none'),
        result.escalated > 0 ? 'success' : 'info',
      );
    } catch {
      showToast(t('dash.escalate.error'), 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      showToast(t('dash.logout.error'), 'error');
    }
  };

  const refresh = () => {
    void queue.refetch();
    void activity.refetch();
  };

  const paymentLabel = (status: string) =>
    t(PAYMENT_KEY[status] ?? 'dash.payment.pending');

  return (
    <div className="min-h-screen bg-[#071a14]">
      <main className="min-h-screen">
        <header className="border-b border-white/10 bg-forest-dark">
          <div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center justify-between gap-4 px-4 lg:px-8">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2.5" aria-label={t('common.homeLabel')}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                  <span className="font-serif text-xl text-gold">{HOTEL.monogram}</span>
                </span>
                <span className="hidden flex-col leading-none sm:flex">
                  <span className="font-serif text-[22px] text-white">{HOTEL.shortName}</span>
                  <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.28em] text-white/50">
                    {t('dash.frontDesk')}
                  </span>
                </span>
              </Link>
              <div className="hidden h-8 w-px bg-white/10 md:block" />
              <div className="hidden items-center gap-2 md:flex">
                <span className="h-2 w-2 animate-gentle-pulse rounded-full bg-[#3DDC84]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
                  {t('dash.live')}
                </span>
                <span className="text-[11px] text-white/40">{dateLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageButton />
              <ViewSiteLink />
              <div className="flex items-center gap-2.5 rounded-full bg-white/[0.08] py-1 pl-1 pr-2 ring-1 ring-white/10">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-[11px] font-extrabold text-forest-dark">
                  {initialsFor(user)}
                </span>
                <span className="hidden flex-col leading-tight sm:flex">
                  <span className="text-[11px] font-bold text-white">{displayName(user)}</span>
                  <span className="text-[9px] text-white/50">{user.role_display}</span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="ml-1 inline-flex min-h-[34px] items-center gap-1 rounded-full px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                    logout
                  </span>
                  <span className="hidden lg:inline">{t('dash.logout')}</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-8 lg:py-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{t('dash.eyebrow')}</p>
              <h1 className="mt-2 font-serif text-3xl text-white sm:text-4xl">
                {greeting}, {displayName(user).split(' ')[0]}.
              </h1>
              <p className="mt-1 text-sm text-white/50">{t('dash.subtitle')}</p>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <button
                type="button"
                onClick={refresh}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-white/15 px-4 text-[12px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
              >
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                  refresh
                </span>
                <span>{t('dash.refresh')}</span>
              </button>
              {queue.data?.generated_at ? (
                <p className="text-[10px] text-white/35">
                  {t('dash.updated', { time: formatClock(queue.data.generated_at, language) })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                key: 'waiting',
                value: String(items.length),
                note: t('dash.stats.waitingNote', { count: items.length }),
                icon: 'inbox',
                accent: false,
              },
              {
                key: 'overdue',
                value: String(overdueCount),
                note: t('dash.stats.overdueNote', { minutes: targetMinutes }),
                icon: 'timer',
                accent: overdueCount > 0,
              },
              {
                key: 'target',
                value: `${targetMinutes} min`,
                note: t('dash.stats.targetNote', { minutes: targetMinutes }),
                icon: 'schedule',
                accent: false,
              },
              {
                key: 'oldest',
                value: items.length > 0 ? formatCountdown(oldestSeconds) : '—',
                note: t('dash.stats.oldestNote'),
                icon: 'hourglass_top',
                accent: false,
              },
            ].map((stat) => (
              <div
                key={stat.key}
                className={`rounded-2xl border p-4 ${
                  stat.accent ? 'border-gold/30 bg-gold/10' : 'border-white/10 bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                      stat.accent ? 'text-gold' : 'text-white/45'
                    }`}
                  >
                    {t(`dash.stats.${stat.key}`)}
                  </p>
                  <span className="material-symbols-outlined text-[18px] text-gold" aria-hidden="true">
                    {stat.icon}
                  </span>
                </div>
                <p className="mt-2 font-serif text-4xl text-white">{stat.value}</p>
                <p className={`mt-0.5 text-[10px] ${stat.accent ? 'text-gold/70' : 'text-white/40'}`}>
                  {stat.note}
                </p>
              </div>
            ))}
          </div>

          {showUndo && lastAction ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3">
              <p className="text-[12px] text-white/75">
                <span className="font-bold text-white">{lastAction.item.reference}</span>{' '}
                {t(
                  lastAction.action.action === 'confirm'
                    ? 'dash.undo.confirmed'
                    : 'dash.undo.declined',
                )}
              </p>
              <button
                type="button"
                onClick={handleUndo}
                disabled={actionMutation.isPending}
                className="btn-gold btn-sm"
              >
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                  undo
                </span>
                <span>{t('dash.undo.button')}</span>
                <span className="text-[11px] font-bold opacity-70">
                  {t('dash.undo.window', { seconds: undoSecondsLeft })}
                </span>
              </button>
            </div>
          ) : null}

          <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <section>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                    {t('dash.queue.eyebrow')}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl text-white">{t('dash.queue.title')}</h2>
                  <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-white/40">
                    {t('dash.queue.text')}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <button
                    type="button"
                    onClick={handleEscalate}
                    disabled={escalateMutation.isPending || items.length === 0}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-[11px] font-semibold text-white/70 transition hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      campaign
                    </span>
                    <span>
                      {escalateMutation.isPending
                        ? t('dash.escalate.busy')
                        : t('dash.escalate.button')}
                    </span>
                  </button>
                  <p className="max-w-[240px] text-right text-[10px] leading-relaxed text-white/30">
                    {t('dash.escalate.note', { minutes: escalateMinutes })}
                  </p>
                </div>
              </div>

              {queue.isPending ? (
                <div className="mt-4 flex min-h-[160px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm text-white/50" role="status">
                  {t('dash.queue.loading')}
                </div>
              ) : queue.isError ? (
                <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-500/10 p-5 text-sm text-red-100">
                  <p>{t('dash.queue.error')}</p>
                  <button
                    type="button"
                    onClick={() => void queue.refetch()}
                    className="mt-3 inline-flex min-h-[38px] items-center rounded-full border border-white/20 px-3 text-[11px] font-semibold text-white/80 transition hover:bg-white/10"
                  >
                    {t('dash.queue.retry')}
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
                  <span className="material-symbols-outlined text-[32px] text-gold" aria-hidden="true">
                    task_alt
                  </span>
                  <h3 className="mt-2 font-serif text-xl text-white">{t('dash.queue.emptyTitle')}</h3>
                  <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-white/45">
                    {t('dash.queue.emptyText')}
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {items.map((item) => {
                    const remaining = secondsUntil(item.deadline_at, now);
                    const overdue = remaining <= 0;
                    const overdueFor = parseTime(item.deadline_at)
                      ? Math.max(0, Math.floor((now - parseTime(item.deadline_at)) / 1000))
                      : 0;
                    const deadlineLabel = overdue
                      ? t('dash.queue.overdue', { time: formatCountdown(overdueFor) })
                      : t('dash.queue.due', { time: formatCountdown(remaining) });
                    const busy =
                      Boolean(busyItem) &&
                      busyItem?.entity_type === item.entity_type &&
                      busyItem?.entity_id === item.id;

                    return (
                      <article
                        key={itemKey(item)}
                        className={`rounded-2xl border bg-white p-4 shadow-soft ${
                          overdue ? 'border-red-200 ring-1 ring-red-100' : 'border-white/10'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="pill bg-forest-50 text-forest">
                              {t(`dash.type.${item.entity_type}`)}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                              {item.reference}
                            </span>
                            <span
                              className={`pill ${
                                overdue ? 'bg-red-100 text-red-700' : 'bg-gold-soft text-gold-deep'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                                timer
                              </span>
                              {deadlineLabel}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted">
                            {t('dash.queue.received', {
                              time: formatClock(item.created_at, language),
                            })}
                          </span>
                        </div>

                        <h3 className="mt-3 text-[16px] font-bold text-forest-dark">{item.guest_name}</h3>
                        <p className="mt-1 text-[12px] leading-relaxed text-muted">{item.summary}</p>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                          <span>{item.phone}</span>
                          {item.amount !== null ? (
                            <span>
                              {t('dash.queue.amount')}:{' '}
                              <strong className="text-ink">{formatMoney(item.amount)}</strong>
                            </span>
                          ) : null}
                          {item.payment_status ? (
                            <span>
                              {t('dash.queue.payment')}: {paymentLabel(item.payment_status)}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleAction(item, 'confirm')}
                            disabled={busy}
                            aria-label={t('dash.queue.confirmLabel', { name: item.guest_name })}
                            className="btn-primary btn-sm"
                          >
                            {t('dash.confirm')}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleAction(item, 'decline')}
                            disabled={busy}
                            aria-label={t('dash.queue.declineLabel', { name: item.guest_name })}
                            className="btn-outline btn-sm"
                          >
                            {t('dash.decline')}
                          </button>
                          <a
                            href={`tel:${item.phone}`}
                            aria-label={t('dash.queue.callLabel', { name: item.guest_name })}
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-forest transition hover:bg-forest-50"
                          >
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                              call
                            </span>
                            <span>{t('dash.call')}</span>
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="grid content-start gap-5">
              <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                      {t('dash.activity.eyebrow')}
                    </p>
                    <h2 className="mt-1 text-[17px] font-bold text-forest-dark">
                      {t('dash.activity.title')}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void activity.refetch()}
                    aria-label={t('dash.refresh')}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-forest-50 text-forest transition hover:bg-forest/10"
                  >
                    <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                      refresh
                    </span>
                  </button>
                </div>

                {activity.isPending ? (
                  <p className="mt-4 text-[12px] text-muted" role="status">
                    {t('dash.queue.loading')}
                  </p>
                ) : activity.isError ? (
                  <div className="mt-4 rounded-xl bg-red-50 p-3 text-[11px] text-red-700">
                    <p>{t('dash.activity.error')}</p>
                    <button
                      type="button"
                      onClick={() => void activity.refetch()}
                      className="mt-2 font-semibold underline"
                    >
                      {t('dash.activity.retry')}
                    </button>
                  </div>
                ) : (activity.data?.results.length ?? 0) === 0 ? (
                  <p className="mt-4 text-[12px] leading-relaxed text-muted">
                    {t('dash.activity.empty')}
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {activity.data?.results.map((row: ActivityRow) => (
                      <li key={row.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                        <p className="text-[12px] leading-relaxed text-ink">
                          {t('dash.activity.line', {
                            actor: row.actor,
                            action: t(ACTION_KEY[row.action] ?? row.action),
                            type: t(`dash.type.${row.entity_type}`),
                          })}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                          <span>{formatStamp(row.created_at, language)}</span>
                          {row.undone_at ? (
                            <span className="pill bg-sand text-muted">{t('dash.activity.undone')}</span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
                  <span className="material-symbols-outlined text-[16px] text-gold" aria-hidden="true">
                    verified_user
                  </span>
                  <span>{t('dash.login.note')}</span>
                </p>
              </section>
            </aside>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-center text-[10px] text-white/30">
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
