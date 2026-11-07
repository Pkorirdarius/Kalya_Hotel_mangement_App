export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function nightsBetween(checkin: string, checkout: string): number {
  if (!checkin || !checkout) {
    return 0;
  }
  const start = new Date(`${checkin}T12:00:00`).getTime();
  const end = new Date(`${checkout}T12:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }
  return Math.round((end - start) / 86_400_000);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isValidKenyanPhone(value: string): boolean {
  const digits = value.replace(/[^\d+]/g, '');
  return /^(\+254|254|0)?7\d{8}$/.test(digits) || /^(\+254|254|0)?1\d{8}$/.test(digits);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
