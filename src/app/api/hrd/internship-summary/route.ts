/**
 * GET /api/hrd/internship-summary
 * Manager-only endpoint (staf_hrd, kepala_hrd, super_admin) for generating the
 * Internship Evaluation Recap (Rekap Penilaian Magang):
 * - Total Hari Hadir (H + 0.5 * Half Day)
 * - Total Jam Hadir (Akumulasi selisih check_out_time - check_in_time selama periode batch)
 * - Persentase Kehadiran terhadap Hari Kerja Efektif Batch (di luar Sabtu-Minggu & Hari Libur Nasional)
 * (Tanpa Total Minggu sesuai keputusan user)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { MANAGER_ROLES, ATTENDEE_ROLES } from '@/lib/permissions';
import { getHolidaysList } from '@/lib/work-config';
import { computeBatchWorkingDaysSummary } from '@/app/api/hrd/holidays/route';
import { dayOfWeekISO } from '@/lib/utils';
import type { Batch, InternshipSummaryRow, InternshipSummaryData } from '@/types';

function formatHoursAndMinutes(totalMinutes: number): string {
  const rounded = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return `${hours}j ${mins}m`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(MANAGER_ROLES);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses ditolak. Hanya Staf HRD, Kepala HRD, dan Super Admin yang dapat melihat Rekap Penilaian Magang.',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const batchIdParam = searchParams.get('batchId');

    const supabase = createAdminClient();

    // 1. Fetch batches
    const { data: allBatches, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .order('batch_number', { ascending: false });

    if (batchError) throw batchError;

    const batches = (allBatches as Batch[]) || [];
    let activeBatch = batches.find((b) => b.is_active) || batches[0];
    if (batchIdParam) {
      const found = batches.find((b) => b.id === batchIdParam);
      if (found) activeBatch = found;
    }

    if (!activeBatch) {
      return NextResponse.json(
        { success: false, error: 'Belum ada data batch magang.' },
        { status: 404 }
      );
    }

    const startDate = activeBatch.start_date;
    const endDate = activeBatch.end_date;

    // 2. Fetch holidays in batch range & compute effective working days
    const { holidays: batchHolidays } = await getHolidaysList(supabase, {
      startDate,
      endDate,
    });
    const holidaySet = new Set(batchHolidays.map((h) => h.date));
    const workingDaysSummary = computeBatchWorkingDaysSummary(
      startDate,
      endDate,
      holidaySet
    );

    // 3. Fetch interns in this batch
    const { data: rawInterns, error: userError } = await supabase
      .from('users')
      .select('id, name, username, email, role, department, batch_id, status')
      .in('role', ATTENDEE_ROLES);

    if (userError) throw userError;

    const interns = ((rawInterns as any[]) || []).filter(
      (u) => !u.batch_id || u.batch_id === activeBatch.id
    );

    // 4. Fetch all attendance records for this batch period
    const { data: rawAttendance, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (attError) throw attError;

    const attendanceByUser = new Map<string, any[]>();
    for (const rec of (rawAttendance as any[]) || []) {
      if (!attendanceByUser.has(rec.user_id)) {
        attendanceByUser.set(rec.user_id, []);
      }
      attendanceByUser.get(rec.user_id)!.push(rec);
    }

    // 5. Build summary rows per intern
    const rows: InternshipSummaryRow[] = [];

    for (const intern of interns) {
      const records = attendanceByUser.get(intern.id) || [];

      let fullDayCount = 0;
      let halfDayCount = 0;
      let overtimeCount = 0;
      let izinCount = 0;
      let sakitCount = 0;
      let alpaCount = 0;
      let totalMinutes = 0;

      for (const rec of records) {
        const dow = dayOfWeekISO(rec.date);
        const isWeekendOrHoliday = dow === 0 || dow === 6 || holidaySet.has(rec.date);
        const isOvertime =
          rec.attendance_status === 'HL' ||
          rec.is_overtime === true ||
          (typeof rec.notes === 'string' &&
            (rec.notes.includes('[LEMBUR]') || rec.notes.includes('[LEMBUR-DISETUJUI]'))) ||
          (isWeekendOrHoliday && Boolean(rec.check_in_time));

        let code = rec.attendance_status;
        if (!code) {
          if (isOvertime) code = 'HL';
          else if (rec.status === 'full_day') code = 'H';
          else if (rec.status === 'half_day') code = '1/2';
        }

        if (code === 'HL' || isOvertime) {
          overtimeCount += 1;
        } else if (code === 'H') {
          fullDayCount += 1;
        } else if (code === '1/2') {
          halfDayCount += 1;
        } else if (code === 'I') {
          izinCount += 1;
        } else if (code === 'S') {
          sakitCount += 1;
        } else if (code === 'A') {
          alpaCount += 1;
        }

        // Accumulate actual duration for days present (H, 1/2, HL)
        if (code === 'H' || code === '1/2' || code === 'HL' || isOvertime) {
          if (rec.check_in_time && rec.check_out_time) {
            const inMs = new Date(rec.check_in_time).getTime();
            const outMs = new Date(rec.check_out_time).getTime();
            if (!isNaN(inMs) && !isNaN(outMs) && outMs > inMs) {
              totalMinutes += (outMs - inMs) / (1000 * 60);
            }
          } else if (code === 'H' || code === 'HL') {
            // Fallback if manually marked H without timestamps: 7.5 hours (08:30 - 16:00)
            totalMinutes += 7.5 * 60;
          } else if (code === '1/2') {
            // Fallback if manually marked 1/2 without timestamps: 4 hours
            totalMinutes += 4 * 60;
          }
        }
      }

      const totalDaysPresent = Number((fullDayCount + halfDayCount * 0.5).toFixed(1));
      const totalHours = Number((totalMinutes / 60).toFixed(1));
      const effectiveDays = workingDaysSummary.effective_working_days || 1;
      const attendancePercentage = Math.min(
        100,
        Number(((totalDaysPresent / effectiveDays) * 100).toFixed(1))
      );

      rows.push({
        user_id: intern.id,
        name: intern.name,
        username: intern.username || (intern.email ? intern.email.split('@')[0] : ''),
        department: intern.department || 'Umum',
        status: intern.status || 'active',
        full_day_count: fullDayCount,
        half_day_count: halfDayCount,
        overtime_count: overtimeCount,
        izin_count: izinCount,
        sakit_count: sakitCount,
        alpa_count: alpaCount,
        total_days_present: totalDaysPresent,
        total_hours: totalHours,
        total_hours_formatted: formatHoursAndMinutes(totalMinutes),
        attendance_percentage: attendancePercentage,
      });
    }

    // Sort by department, then by name
    rows.sort((a, b) => {
      const d = a.department.localeCompare(b.department);
      return d !== 0 ? d : a.name.localeCompare(b.name);
    });

    const summaryData: InternshipSummaryData = {
      batch: activeBatch,
      effective_working_days: workingDaysSummary.effective_working_days,
      total_calendar_days: workingDaysSummary.total_calendar_days,
      weekend_days: workingDaysSummary.weekend_days,
      holiday_days: workingDaysSummary.weekday_holiday_days,
      rows,
    };

    return NextResponse.json({
      success: true,
      data: summaryData,
      batches,
    });
  } catch (error: any) {
    console.error('[/api/hrd/internship-summary GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal memuat Rekap Penilaian Magang.',
      },
      { status: 500 }
    );
  }
}

