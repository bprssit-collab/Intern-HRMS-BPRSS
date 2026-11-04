/**
 * Payout Calculation Logic
 * 
 * CRITICAL ISOLATION: This module must ONLY be imported in:
 *   - /src/app/hrd/payout/page.tsx
 *   - /src/app/api/hrd/payout/route.ts
 * 
 * Never import payout-calc in any intern-facing module.
 * Financial data (rates, totals) must be invisible to interns.
 */

import type { Attendance, PayoutSummary, User } from '@/types';
import {
  DEFAULT_WORK_START_TIME,
  DEFAULT_FULL_DAY_MAX_IN,
  DEFAULT_WORK_END_TIME,
  DEFAULT_OVERTIME_RATE,
} from './constants';

/**
 * Minimum hours worked for a day to qualify as "Full Day" (legacy reference).
 */
export const FULL_DAY_HOURS_THRESHOLD = 6;

export interface AttendanceTimeRules {
  work_start_time?: string;   // Default '08:30'
  full_day_max_in?: string;   // Default '10:30'
  work_end_time?: string;     // Default '16:00'
}

/**
 * Extracts 24-hour HH:MM string in Asia/Jakarta (WIB) timezone from an ISO timestamp.
 * Example: '2026-11-03T01:15:00.000Z' -> '08:15'
 */
export function toWIBTimeHHMM(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  if (isNaN(d.getTime())) return '00:00';

  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  }).formatToParts(d);

  const hour = (parts.find((p) => p.type === 'hour')?.value || '00').padStart(2, '0');
  const minute = (parts.find((p) => p.type === 'minute')?.value || '00').padStart(2, '0');
  return `${hour === '24' ? '00' : hour}:${minute}`;
}

function normalizeHHMM(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const clean = val.trim().replace('.', ':');
  const m = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/**
 * Determines the attendance status based on configurable check-in & check-out time boundaries (WIB):
 * - Check-in <= full_day_max_in (default 10:30) AND Check-out >= work_end_time (default 16:00) -> 'full_day' (H)
 * - Check-in <= full_day_max_in (default 10:30) AND Check-out < work_end_time (default 16:00)  -> 'half_day' (1/2)
 * - Check-in > full_day_max_in (default 10:30) (regardless of check-out time)                  -> 'half_day' (1/2)
 */
export function calculateAttendanceStatus(
  checkInTime: string,
  checkOutTime: string,
  rules?: AttendanceTimeRules
): 'full_day' | 'half_day' {
  const maxIn = normalizeHHMM(rules?.full_day_max_in, DEFAULT_FULL_DAY_MAX_IN);
  const minOut = normalizeHHMM(rules?.work_end_time, DEFAULT_WORK_END_TIME);

  const checkInWIB = toWIBTimeHHMM(checkInTime);
  const checkOutWIB = toWIBTimeHHMM(checkOutTime);

  if (checkInWIB <= maxIn && checkOutWIB >= minOut) {
    return 'full_day';
  }
  return 'half_day';
}

/** Pocket-money rates (IDR) of one batch. */
export interface PayoutRates {
  full: number;
  half: number;
  perbantuanFull: number;
  perbantuanHalf: number;
  overtime?: number;
}

/**
 * Calculates payout summaries for all interns within a date range.
 * Distinguishes between Regular Internship Days and Perbantuan (Extended Duty) Days.
 * 
 * @param attendanceRecords - All attendance records within date range
 * @param users - Map of user ID to User object
 * @param fullDayRate - Fallback regular rate per full day (IDR)
 * @param halfDayRate - Fallback regular rate per half day (IDR)
 * @param perbantuanFullDayRate - Fallback perbantuan rate per full day (IDR)
 * @param perbantuanHalfDayRate - Fallback perbantuan rate per half day (IDR)
 * @param ratesByUser - Optional per-user rates (taken from each intern's batch); overrides the fallback
 * @returns Array of PayoutSummary, one per intern
 */
export function calculatePayouts(
  attendanceRecords: Attendance[],
  users: Map<string, User>,
  fullDayRate: number,
  halfDayRate: number,
  perbantuanFullDayRate: number = 50000,
  perbantuanHalfDayRate: number = 25000,
  ratesByUser?: Map<string, PayoutRates>,
  defaultOvertimeRate: number = DEFAULT_OVERTIME_RATE
): PayoutSummary[] {
  // Group attendance records by user_id
  const grouped = new Map<
    string,
    {
      normalFull: number;
      normalHalf: number;
      perbantuanFull: number;
      perbantuanHalf: number;
      overtimeDays: number;
    }
  >();

  for (const record of attendanceRecords) {
    const isApprovedOvertime =
      record.attendance_status === 'HL' ||
      (record.is_overtime === true && record.overtime_approved === true) ||
      (typeof record.notes === 'string' && record.notes.includes('[LEMBUR-DISETUJUI]'));

    // Only count completed check-outs or approved attendance / approved overtime
    if ((!record.status || record.status === 'pending') && !isApprovedOvertime) {
      continue;
    }

    if (!grouped.has(record.user_id)) {
      grouped.set(record.user_id, {
        normalFull: 0,
        normalHalf: 0,
        perbantuanFull: 0,
        perbantuanHalf: 0,
        overtimeDays: 0,
      });
    }

    const counts = grouped.get(record.user_id)!;

    if (isApprovedOvertime) {
      counts.overtimeDays += 1;
      continue;
    }

    // If unapproved overtime on weekend/holiday, do not count into regular weekday payout until approved
    const isUnapprovedOvertime =
      record.is_overtime === true && record.overtime_approved !== true;
    if (isUnapprovedOvertime) {
      continue;
    }

    const isPerbantuan = record.is_perbantuan === true;

    if (record.status === 'full_day') {
      if (isPerbantuan) {
        counts.perbantuanFull += 1;
      } else {
        counts.normalFull += 1;
      }
    } else if (record.status === 'half_day') {
      if (isPerbantuan) {
        counts.perbantuanHalf += 1;
      } else {
        counts.normalHalf += 1;
      }
    }
  }

  // Build payout summaries
  const summaries: PayoutSummary[] = [];

  for (const [userId, counts] of grouped.entries()) {
    const user = users.get(userId);
    if (!user || (user.role !== 'intern' && user.role !== 'intern_hrd')) continue; // Safety check

    const userRates = ratesByUser?.get(userId);
    const fullRate = userRates?.full ?? fullDayRate;
    const halfRate = userRates?.half ?? halfDayRate;
    const pFullRate = userRates?.perbantuanFull ?? perbantuanFullDayRate;
    const pHalfRate = userRates?.perbantuanHalf ?? perbantuanHalfDayRate;
    const otRate = userRates?.overtime ?? defaultOvertimeRate;

    const normalAmount =
      counts.normalFull * fullRate + counts.normalHalf * halfRate;
    const perbantuanAmount =
      counts.perbantuanFull * pFullRate +
      counts.perbantuanHalf * pHalfRate;
    const overtimeAmount = counts.overtimeDays * otRate;
    const totalAmount = normalAmount + perbantuanAmount + overtimeAmount;

    summaries.push({
      user_id: userId,
      intern_name: user.name,
      department: user.department,
      is_perbantuan: user.status === 'perbantuan' || (counts.perbantuanFull + counts.perbantuanHalf > 0),
      full_day_count: counts.normalFull,
      half_day_count: counts.normalHalf,
      perbantuan_full_count: counts.perbantuanFull,
      perbantuan_half_count: counts.perbantuanHalf,
      overtime_count: counts.overtimeDays,
      normal_amount: normalAmount,
      perbantuan_amount: perbantuanAmount,
      overtime_amount: overtimeAmount,
      full_day_rate: fullRate,
      half_day_rate: halfRate,
      perbantuan_full_rate: pFullRate,
      perbantuan_half_rate: pHalfRate,
      overtime_rate: otRate,
      total_amount: totalAmount,
    });
  }

  // Sort by intern name alphabetically
  return summaries.sort((a, b) => a.intern_name.localeCompare(b.intern_name));
}

/**
 * Formats IDR currency for display.
 * Example: 75000 → "Rp 75.000"
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculates the grand total across all payout summaries.
 */
export function calculateGrandTotal(summaries: PayoutSummary[]): number {
  return summaries.reduce((sum, s) => sum + s.total_amount, 0);
}
