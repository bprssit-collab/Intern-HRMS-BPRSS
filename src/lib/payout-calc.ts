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

/** 
 * Minimum hours worked for a day to qualify as "Full Day".
 * Days with less than this are counted as "Half Day".
 */
export const FULL_DAY_HOURS_THRESHOLD = 6;

/**
 * Determines the attendance status based on hours worked.
 * @param checkInTime - ISO timestamp of check-in
 * @param checkOutTime - ISO timestamp of check-out
 * @returns 'full_day' if hours > 6, 'half_day' otherwise
 */
export function calculateAttendanceStatus(
  checkInTime: string,
  checkOutTime: string
): 'full_day' | 'half_day' {
  const checkIn = new Date(checkInTime).getTime();
  const checkOut = new Date(checkOutTime).getTime();

  // Calculate difference in hours
  const hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);

  return hoursWorked > FULL_DAY_HOURS_THRESHOLD ? 'full_day' : 'half_day';
}

/**
 * Calculates payout summaries for all interns within a date range.
 * Distinguishes between Regular Internship Days and Perbantuan (Extended Duty) Days.
 * 
 * @param attendanceRecords - All attendance records within date range
 * @param users - Map of user ID to User object
 * @param fullDayRate - Regular rate per full day (IDR)
 * @param halfDayRate - Regular rate per half day (IDR)
 * @param perbantuanFullDayRate - Perbantuan rate per full day (IDR)
 * @param perbantuanHalfDayRate - Perbantuan rate per half day (IDR)
 * @returns Array of PayoutSummary, one per intern
 */
export function calculatePayouts(
  attendanceRecords: Attendance[],
  users: Map<string, User>,
  fullDayRate: number,
  halfDayRate: number,
  perbantuanFullDayRate: number = 75000,
  perbantuanHalfDayRate: number = 37500
): PayoutSummary[] {
  // Group attendance records by user_id
  const grouped = new Map<
    string,
    {
      normalFull: number;
      normalHalf: number;
      perbantuanFull: number;
      perbantuanHalf: number;
    }
  >();

  for (const record of attendanceRecords) {
    // Only count completed check-outs or approved attendance
    if (!record.status || record.status === 'pending') {
      continue;
    }

    if (!grouped.has(record.user_id)) {
      grouped.set(record.user_id, {
        normalFull: 0,
        normalHalf: 0,
        perbantuanFull: 0,
        perbantuanHalf: 0,
      });
    }

    const counts = grouped.get(record.user_id)!;
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
    if (!user || user.role !== 'intern') continue; // Safety check

    const normalAmount =
      counts.normalFull * fullDayRate + counts.normalHalf * halfDayRate;
    const perbantuanAmount =
      counts.perbantuanFull * perbantuanFullDayRate +
      counts.perbantuanHalf * perbantuanHalfDayRate;
    const totalAmount = normalAmount + perbantuanAmount;

    summaries.push({
      user_id: userId,
      intern_name: user.name,
      department: user.department,
      is_perbantuan: user.status === 'perbantuan' || (counts.perbantuanFull + counts.perbantuanHalf > 0),
      full_day_count: counts.normalFull,
      half_day_count: counts.normalHalf,
      perbantuan_full_count: counts.perbantuanFull,
      perbantuan_half_count: counts.perbantuanHalf,
      normal_amount: normalAmount,
      perbantuan_amount: perbantuanAmount,
      full_day_rate: fullDayRate,
      half_day_rate: halfDayRate,
      perbantuan_full_rate: perbantuanFullDayRate,
      perbantuan_half_rate: perbantuanHalfDayRate,
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
