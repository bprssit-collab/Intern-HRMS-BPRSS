import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges Tailwind CSS class names with conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a date string to Indonesian locale display in Asia/Jakarta (WIB) */
export function formatDateID(dateStr: string): string {
  if (!dateStr) return '-';
  const d = dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T12:00:00Z`);
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
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
