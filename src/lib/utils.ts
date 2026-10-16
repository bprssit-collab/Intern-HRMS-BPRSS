import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges Tailwind CSS class names with conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a date string to Indonesian format hh/bb/tttt (DD/MM/YYYY) in Asia/Jakarta (WIB) */
export function formatDateID(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';

  // Fast-path for ISO date strings YYYY-MM-DD
  const clean = String(dateStr).split('T')[0].trim();
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }

  // Fallback for timestamps or Date representations in Asia/Jakarta (WIB)
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';

  const parts = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).formatToParts(d);

  const day = parts.find((p) => p.type === 'day')?.value.padStart(2, '0') || '01';
  const month = parts.find((p) => p.type === 'month')?.value.padStart(2, '0') || '01';
  const year = parts.find((p) => p.type === 'year')?.value || String(d.getFullYear());

  return `${day}/${month}/${year}`;
}

/** Formats a datetime string to time-only HH:MM in Asia/Jakarta (WIB) */
export function formatTime(dateStr: string): string {
  if (!dateStr) return '--:--';
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

/** Returns today's date as YYYY-MM-DD string in Asia/Jakarta (WIB) */
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

/**
 * Returns a 1-month range anchored on the current date (tanggal berjalan) in Asia/Jakarta (WIB).
 * Start: 1 month prior to today (e.g. 16/09/2026 if today is 16/10/2026).
 * End: today (tanggal berjalan, e.g. 16/10/2026).
 */
export function getDefaultPayoutRange(): { start: string; end: string } {
  const endIso = todayISO();
  const [y, m, d] = endIso.split('-').map(Number);
  
  // Safe 1-month backward date calculation
  const targetDate = new Date(y, m - 2, d);
  const startYear = targetDate.getFullYear();
  const startMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
  const startDay = String(targetDate.getDate()).padStart(2, '0');
  const startIso = `${startYear}-${startMonth}-${startDay}`;

  return { start: startIso, end: endIso };
}

/**
 * Returns the calendar month range for the current month in Asia/Jakarta (WIB).
 * Start: 1st of current month (e.g. 01/10/2026).
 * End: last day of current month (e.g. 31/10/2026).
 */
export function getCurrentCalendarMonthRange(): { start: string; end: string } {
  const todayStr = todayISO();
  const [y, m] = todayStr.split('-').map(Number);
  const startIso = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDayDate = new Date(y, m, 0);
  const lastDay = String(lastDayDate.getDate()).padStart(2, '0');
  const endIso = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
  return { start: startIso, end: endIso };
}

// ------------------------------------------------------------
// Week helpers (weeks run Monday -> Sunday). All pure date-string math.
// ------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function isoToUtcMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcMsToIso(ms: number): string {
  return new Date(ms).toISOString().split('T')[0];
}

/** Adds `days` (can be negative) to a YYYY-MM-DD string. */
export function addDaysISO(iso: string, days: number): string {
  return utcMsToIso(isoToUtcMs(iso) + days * DAY_MS);
}

/** Day of week for a YYYY-MM-DD string: 0 = Sunday ... 6 = Saturday. */
export function dayOfWeekISO(iso: string): number {
  return new Date(isoToUtcMs(iso)).getUTCDay();
}

/** Monday (YYYY-MM-DD) of the week that contains `iso`. */
export function mondayOfISO(iso: string): string {
  const dow = dayOfWeekISO(iso);
  return addDaysISO(iso, -((dow + 6) % 7));
}

/** Default recap range: Monday of the current week through Sunday of next week (2 weeks, WIB). */
export function getDefaultRecapRange(): { start: string; end: string } {
  const monday = mondayOfISO(todayISO());
  return { start: monday, end: addDaysISO(monday, 13) };
}

/**
 * Week number of `dateISO` relative to the batch start (week 1 = the Monday-Sunday
 * week that contains batch start). Returns <= 0 for dates before that week.
 */
export function getBatchWeekNumber(dateISO: string, batchStartISO: string): number {
  const diff = isoToUtcMs(mondayOfISO(dateISO)) - isoToUtcMs(mondayOfISO(batchStartISO));
  return Math.round(diff / (7 * DAY_MS)) + 1;
}

/** Total number of batch weeks from batch start to batch end (inclusive). */
export function getBatchWeekCount(batchStartISO: string, batchEndISO: string): number {
  return getBatchWeekNumber(batchEndISO, batchStartISO);
}

/** Capitalizes first letter of a string */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Maps attendance status to Indonesian label */
export function statusLabel(status: string | null): string {
  switch (status) {
    case 'full_day': return 'Penuh';
    case 'half_day': return 'Setengah';
    case 'pending': return 'Belum Absen Pulang';
    default: return '-';
  }
}

/** Maps attendance status to Tailwind color class */
export function statusColor(status: string | null): string {
  switch (status) {
    case 'full_day': return 'text-emerald-400 bg-emerald-400/10';
    case 'half_day': return 'text-amber-400 bg-amber-400/10';
    case 'pending': return 'text-blue-400 bg-blue-400/10';
    default: return 'text-slate-400 bg-slate-400/10';
  }
}
