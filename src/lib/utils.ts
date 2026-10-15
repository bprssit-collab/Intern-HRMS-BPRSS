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
