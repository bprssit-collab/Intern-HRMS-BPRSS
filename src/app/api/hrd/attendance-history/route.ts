/**
 * GET /api/hrd/attendance-history?date=YYYY-MM-DD&batchId=...
 * Daily attendance log: who checked in on a given day (defaults to today, WIB).
 * Different from the recap, which is a multi-day matrix per intern.
 * Access: staf_hrd, kepala_hrd, super_admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { MANAGER_ROLES, ATTENDEE_ROLES } from '@/lib/permissions';
import { todayISO } from '@/lib/utils';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(MANAGER_ROLES);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Khusus Staf HRD, Kepala HRD, dan Super Admin.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const batchId = searchParams.get('batchId');
    const date = dateParam && ISO_DATE.test(dateParam) ? dateParam : todayISO();

    const supabase = createAdminClient();

    const [{ data: batchRows }, { data: userRows }, { data: attendanceRows, error }] = await Promise.all([
      supabase.from('batches').select('id, batch_number, name, is_active').order('batch_number', { ascending: false }),
      supabase
        .from('users')
        .select('id, name, email, role, department, batch_id, status')
        .in('role', ATTENDEE_ROLES),
      supabase.from('attendance').select('*').eq('date', date),
    ]);

    if (error) throw error;

    const batches = (batchRows as any[]) || [];
    const batchName = new Map<string, string>(batches.map((b) => [b.id, b.name]));

    let interns = (userRows as any[]) || [];
    if (batchId) {
      interns = interns.filter((u) => u.batch_id === batchId);
    }
    const internMap = new Map<string, any>(interns.map((u) => [u.id, u]));

    // Only records of interns inside the selected scope that actually checked in
    const attended = ((attendanceRows as any[]) || [])
      .filter((rec) => internMap.has(rec.user_id) && rec.check_in_time)
      .map((rec) => {
        const u = internMap.get(rec.user_id);
        return {
          id: rec.id,
          user_id: rec.user_id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department || 'Umum',
          batch_name: u.batch_id ? batchName.get(u.batch_id) || '-' : '-',
          intern_status: u.status || 'active',
          check_in_time: rec.check_in_time,
          check_out_time: rec.check_out_time,
          distance_from_office: rec.distance_from_office,
          status: rec.status,
          attendance_status: rec.attendance_status || null,
          notes: rec.notes || null,
        };
      })
      .sort((a, b) => String(a.check_in_time).localeCompare(String(b.check_in_time)));

    // Interns without a physical check-in on this day (excluding completed/alumni)
    const attendedIds = new Set(attended.map((a) => a.user_id));
    const absentRecordByUser = new Map<string, any>(
      ((attendanceRows as any[]) || []).map((rec) => [rec.user_id, rec])
    );
    const notAttended = interns
      .filter((u) => !attendedIds.has(u.id) && (u.status || 'active') !== 'completed')
      .map((u) => ({
        user_id: u.id,
        name: u.name,
        department: u.department || 'Umum',
        batch_name: u.batch_id ? batchName.get(u.batch_id) || '-' : '-',
        attendance_status: absentRecordByUser.get(u.id)?.attendance_status || null,
      }))
      .sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      data: {
        date,
        attended,
        notAttended,
        totals: {
          interns: attended.length + notAttended.length,
          attended: attended.length,
          notAttended: notAttended.length,
        },
      },
      batches,
    });
  } catch (error: any) {
    console.error('[/api/hrd/attendance-history GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
