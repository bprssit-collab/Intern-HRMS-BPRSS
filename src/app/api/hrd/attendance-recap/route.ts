/**
 * /api/hrd/attendance-recap
 * HRD-portal endpoint for generating the horizontal matrix attendance recap (matching the excel
 * reference) and for manually updating attendance codes (H, 1/2, I, S, A) with notes.
 *
 * Week numbering (MINGGU 1, 2, ...) is relative to the batch start date (Monday-Sunday weeks).
 * Edit rights are enforced here via getAttendanceEditPolicy() - the UI only mirrors them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import {
  HRD_PORTAL_ROLES,
  ATTENDEE_ROLES,
  getAttendanceEditPolicy,
} from '@/lib/permissions';
import {
  addDaysISO,
  dayOfWeekISO,
  getBatchWeekCount,
  getBatchWeekNumber,
  getDefaultRecapRange,
} from '@/lib/utils';
import type { Batch, AttendanceCode, AttendanceRecapData, MatrixDepartmentGroup, MatrixRow } from '@/types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_CODES: AttendanceCode[] = ['H', '1/2', 'I', 'S', 'A'];
const MAX_RANGE_DAYS = 200;

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// Generate calendar days between two dates (inclusive) with week labels relative to the batch start
function getDatesInRange(start: string, end: string, batch: Batch) {
  const result: { date: string; dayName: string; is_weekend: boolean; weekNumber: number; weekLabel: string }[] = [];
  const totalWeeks = getBatchWeekCount(batch.start_date, batch.end_date);

  let curr = start;
  let guard = 0;
  while (curr <= end && guard <= MAX_RANGE_DAYS) {
    const dayOfWeek = dayOfWeekISO(curr); // 0 is Sunday, 6 is Saturday
    const weekNumber = getBatchWeekNumber(curr, batch.start_date);
    const insideBatch = weekNumber >= 1 && weekNumber <= totalWeeks;

    result.push({
      date: curr,
      dayName: DAY_NAMES[dayOfWeek],
      is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
      weekNumber,
      weekLabel: insideBatch ? `MINGGU ${weekNumber}` : 'DI LUAR BATCH',
    });

    curr = addDaysISO(curr, 1);
    guard += 1;
  }

  return result;
}

const forbidden = () =>
  NextResponse.json(
    { success: false, error: 'Akses ditolak. Khusus HRD.' },
    { status: 403 }
  );

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(HRD_PORTAL_ROLES);
    if (!session) return forbidden();

    const { searchParams } = new URL(request.url);
    const batchIdParam = searchParams.get('batchId');
    let startDate = searchParams.get('startDate');
    let endDate = searchParams.get('endDate');

    const supabase = createAdminClient();

    // 1. Get Batches
    const { data: allBatches } = await supabase.from('batches').select('*').order('batch_number', { ascending: false });
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

    // Default range: current week + next week (Monday-Sunday, WIB)
    if (!startDate || !endDate || !ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
      const def = getDefaultRecapRange();
      startDate = def.start;
      endDate = def.end;
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { success: false, error: 'Tanggal mulai tidak boleh melebihi tanggal selesai.' },
        { status: 400 }
      );
    }

    const dateList = getDatesInRange(startDate, endDate, activeBatch);

    // Group consecutive days with the same week label for colSpan header
    const weeks: { label: string; dateCount: number }[] = [];
    for (const d of dateList) {
      const last = weeks[weeks.length - 1];
      if (last && last.label === d.weekLabel) {
        last.dateCount += 1;
      } else {
        weeks.push({ label: d.weekLabel, dateCount: 1 });
      }
    }

    // 2. Fetch interns (intern + intern_hrd both attend) for this batch
    const { data: rawInterns } = await supabase
      .from('users')
      .select('id, name, email, role, department, batch_id, status')
      .in('role', ATTENDEE_ROLES);

    const interns = ((rawInterns as any[]) || []).filter(
      (u) => !u.batch_id || u.batch_id === activeBatch.id
    );

    // 3. Fetch attendance in range
    const { data: rawAttendance } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    const attendanceRecords = (rawAttendance as any[]) || [];

    // Map: userId -> (date -> record)
    const userAttendanceMap = new Map<string, Map<string, any>>();
    for (const rec of attendanceRecords) {
      if (!userAttendanceMap.has(rec.user_id)) {
        userAttendanceMap.set(rec.user_id, new Map());
      }
      userAttendanceMap.get(rec.user_id)!.set(rec.date, rec);
    }

    // 4. Build Matrix rows
    const departmentMap = new Map<string, MatrixRow[]>();

    for (const intern of interns) {
      const dept = intern.department || 'Umum';
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, []);
      }

      const userRecs = userAttendanceMap.get(intern.id) || new Map();
      const cells: MatrixRow['cells'] = {};
      const summary = { H: 0, S: 0, I: 0, A: 0, Full: 0, Half: 0 };
      const notesList: string[] = [];

      for (const d of dateList) {
        const rec = userRecs.get(d.date);
        let code: AttendanceCode | null = null;
        let isPerbantuan = intern.status === 'perbantuan';

        if (rec) {
          if (rec.attendance_status) {
            code = rec.attendance_status as AttendanceCode;
          } else if (rec.status === 'full_day') {
            code = 'H';
          } else if (rec.status === 'half_day') {
            code = '1/2';
          }

          if (rec.is_perbantuan !== undefined) {
            isPerbantuan = rec.is_perbantuan;
          }

          if (rec.notes) {
            notesList.push(rec.notes);
          }
        }

        // Aggregate summary
        if (code === 'H') {
          summary.H += 1;
          summary.Full += 1;
        } else if (code === '1/2') {
          summary.Half += 1;
        } else if (code === 'I') {
          summary.I += 1;
        } else if (code === 'S') {
          summary.S += 1;
        } else if (code === 'A') {
          summary.A += 1;
        }

        cells[d.date] = {
          date: d.date,
          code,
          is_weekend: d.is_weekend,
          is_perbantuan: isPerbantuan,
          notes: rec?.notes || null,
          record_id: rec?.id,
          attended: isAttendedRecord(rec),
          edit_count: rec?.edit_count ?? 0,
        };
      }

      // Unique notes
      const uniqueNotes = Array.from(new Set(notesList));

      departmentMap.get(dept)!.push({
        user_id: intern.id,
        name: intern.name,
        department: dept,
        status: intern.status || 'active',
        cells,
        summary,
        notesList: uniqueNotes,
      });
    }

    // Departments in desired sequence
    const preferredOrder = [
      'CS',
      'Teller UNPAM',
      'SDM',
      'Accounting',
      'Kepatuhan',
      'Kredit',
      'Audit',
      'Social Media',
      'Umum',
    ];

    const departments: MatrixDepartmentGroup[] = [];

    // Add ordered depts
    for (const pDept of preferredOrder) {
      if (departmentMap.has(pDept)) {
        departments.push({
          department: pDept,
          rows: departmentMap.get(pDept)!,
        });
        departmentMap.delete(pDept);
      }
    }

    // Add any remaining depts
    for (const [dept, rows] of departmentMap.entries()) {
      departments.push({ department: dept, rows });
    }

    const responseData: AttendanceRecapData = {
      batch: activeBatch,
      startDate,
      endDate,
      dateList: dateList.map((d) => ({
        date: d.date,
        dayName: d.dayName,
        is_weekend: d.is_weekend,
        weekLabel: d.weekLabel,
      })),
      weeks,
      departments,
      currentRole: session.role,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      batches,
    });
  } catch (error: any) {
    console.error('[/api/hrd/attendance-recap GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

/**
 * An intern "attended" when they actually checked in, or when the record already carries a
 * present code (H / 1/2). Everything else (no record, or only S / I / A) counts as absent.
 */
function isAttendedRecord(rec: any): boolean {
  if (!rec) return false;
  return (
    !!rec.check_in_time ||
    rec.attendance_status === 'H' ||
    rec.attendance_status === '1/2' ||
    rec.status === 'full_day' ||
    rec.status === 'half_day'
  );
}

/** WIB timestamp helper, e.g. wibTime('2026-10-01', '08:00') -> ISO string (UTC) */
function wibTime(date: string, hhmm: string): string {
  return new Date(`${date}T${hhmm}:00+07:00`).toISOString();
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole(HRD_PORTAL_ROLES);
    if (!session) return forbidden();

    const body = await request.json();
    const { user_id, date, attendance_status, notes } = body;

    if (!user_id || !date || !ISO_DATE.test(date)) {
      return NextResponse.json(
        { success: false, error: 'User ID dan tanggal wajib diisi.' },
        { status: 400 }
      );
    }

    if (!attendance_status || !VALID_CODES.includes(attendance_status)) {
      return NextResponse.json(
        { success: false, error: 'Kode kehadiran tidak valid.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Target must be an attending intern account
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('id', user_id)
      .single();

    if (!targetUser || !ATTENDEE_ROLES.includes(targetUser.role)) {
      return NextResponse.json(
        { success: false, error: 'Data anak magang tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Check if attendance record exists
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user_id)
      .eq('date', date)
      .single();

    // Enforce the edit rules on the server
    const editCount: number = existing?.edit_count ?? 0;
    const policy = getAttendanceEditPolicy(session.role, {
      attended: isAttendedRecord(existing),
      editCount,
    });

    if (!policy.allowed) {
      return NextResponse.json(
        { success: false, error: policy.message },
        { status: 403 }
      );
    }

    if (!policy.allowedCodes.includes(attendance_status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Kode ${attendance_status} tidak diizinkan. Pilihan yang tersedia: ${policy.allowedCodes.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    const trimmedNotes = typeof notes === 'string' ? notes.trim() : '';
    if (policy.requireNotes && !trimmedNotes) {
      return NextResponse.json(
        { success: false, error: 'Keterangan wajib diisi untuk status S / I / A.' },
        { status: 400 }
      );
    }

    // Map code to status
    let status: 'full_day' | 'half_day' | 'pending' = 'pending';
    if (attendance_status === 'H') status = 'full_day';
    if (attendance_status === '1/2') status = 'half_day';

    const editMeta = {
      edit_count: editCount + 1,
      last_edited_by: session.id,
      last_edited_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      const update: Record<string, any> = {
        attendance_status,
        status,
        ...editMeta,
      };
      if (notes !== undefined) update.notes = trimmedNotes || null;

      // Present codes need complete times so the day is counted in the payout
      if (attendance_status === 'H' || attendance_status === '1/2') {
        if (!existing.check_in_time) update.check_in_time = wibTime(date, '08:00');
        if (!existing.check_out_time) {
          update.check_out_time = wibTime(date, attendance_status === 'H' ? '17:00' : '12:00');
        }
      }

      result = await supabase
        .from('attendance')
        .update(update)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('attendance')
        .insert({
          user_id,
          date,
          attendance_status,
          status,
          is_perbantuan: targetUser.status === 'perbantuan',
          notes: trimmedNotes || null,
          check_in_time: null,
          check_out_time: null,
          ...editMeta,
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Status absensi berhasil diperbarui.',
    });
  } catch (error: any) {
    console.error('[/api/hrd/attendance-recap PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
