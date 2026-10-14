/**
 * /api/hrd/attendance-recap
 * HRD-only endpoint for generating horizontal matrix attendance recap (matching excel reference)
 * and updating attendance codes (H, 1/2, I, S, A) and detailed notes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import type { Batch, AttendanceCode, AttendanceRecapData, MatrixDepartmentGroup, MatrixRow } from '@/types';

// Helper to format Date to YYYY-MM-DD
function formatISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Generate calendar days between two dates
function getDatesInRange(start: string, end: string) {
  const result: { date: string; dayName: string; is_weekend: boolean; weekNumber: number; weekLabel: string }[] = [];
  const curr = new Date(start);
  const stop = new Date(end);

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  while (curr <= stop) {
    const dayOfWeek = curr.getDay(); // 0 is Sunday, 6 is Saturday
    const dateStr = formatISO(curr);
    
    // Estimate week number (1-based relative to start)
    const diffDays = Math.floor((curr.getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
    const weekIndex = Math.floor(diffDays / 7) + 1;

    result.push({
      date: dateStr,
      dayName: dayNames[dayOfWeek],
      is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
      weekNumber: weekIndex,
      weekLabel: `MINGGU ${weekIndex}`,
    });

    curr.setDate(curr.getDate() + 1);
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('hrd');
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Khusus HRD.' },
        { status: 403 }
      );
    }

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

    // Default dates: default to Minggu 5 & 6 (2026-09-28 to 2026-10-11) or 14-day window
    if (!startDate || !endDate) {
      startDate = '2026-09-28';
      endDate = '2026-10-11';
    }

    const dateList = getDatesInRange(startDate, endDate);

    // Group weeks for colSpan header
    const weekMap = new Map<string, number>();
    for (const d of dateList) {
      weekMap.set(d.weekLabel, (weekMap.get(d.weekLabel) || 0) + 1);
    }
    const weeks = Array.from(weekMap.entries()).map(([label, count]) => ({
      label,
      dateCount: count,
    }));

    // 2. Fetch interns for this batch
    const { data: rawInterns } = await supabase
      .from('users')
      .select('id, name, email, role, department, batch_id, status')
      .eq('role', 'intern');

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

export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole('hrd');
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Khusus HRD.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id, date, attendance_status, notes } = body;

    if (!user_id || !date) {
      return NextResponse.json(
        { success: false, error: 'User ID dan tanggal wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if attendance record exists
    const { data: existing } = await supabase
      .from('attendance')
      .select('id, user_id, date')
      .eq('user_id', user_id)
      .eq('date', date)
      .single();

    // Map code to status
    let status: 'full_day' | 'half_day' | 'pending' = 'pending';
    if (attendance_status === 'H') status = 'full_day';
    if (attendance_status === '1/2') status = 'half_day';

    let result;
    if (existing) {
      result = await supabase
        .from('attendance')
        .update({
          attendance_status: attendance_status || null,
          status,
          notes: notes !== undefined ? notes : undefined,
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('attendance')
        .insert({
          user_id,
          date,
          attendance_status: attendance_status || null,
          status,
          notes: notes || null,
          check_in_time: attendance_status === 'H' || attendance_status === '1/2' ? `${date}T08:00:00.000Z` : null,
          check_out_time: attendance_status === 'H' ? `${date}T17:00:00.000Z` : attendance_status === '1/2' ? `${date}T12:00:00.000Z` : null,
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
