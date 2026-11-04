/**
 * POST /api/attendance/checkout
 * Records a check-out event. Automatically calculates and sets attendance status
 * based on configurable time boundaries (work_start_time, full_day_max_in, work_end_time):
 *   - Check-in <= 10:30 WIB AND Check-out >= 16:00 WIB -> full_day ('H')
 *   - Otherwise -> half_day ('1/2')
 * Supports weekend/holiday overtime ('HL' / is_overtime).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { calculateAttendanceStatus, toWIBTimeHHMM } from '@/lib/payout-calc';
import { getWorkHoursConfig, getHolidaysList } from '@/lib/work-config';
import { INTERN_PORTAL_ROLES } from '@/lib/permissions';
import { todayISO, dayOfWeekISO } from '@/lib/utils';
import { verifyFaceDescriptors } from '@/lib/face-math';

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(INTERN_PORTAL_ROLES);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Silakan login sebagai intern.' },
        { status: 403 }
      );
    }

    let face_descriptor: number[] | null = null;
    try {
      const body = await request.json();
      if (body?.face_descriptor && Array.isArray(body.face_descriptor)) {
        face_descriptor = body.face_descriptor;
      }
    } catch {
      // Body may be empty if called from legacy client
    }

    const supabase = createAdminClient();

    // Verify user profile & registered face descriptor
    const { data: userRow } = await supabase
      .from('users')
      .select('face_descriptor')
      .eq('id', session.id)
      .single();

    if (!userRow?.face_descriptor || !Array.isArray(userRow.face_descriptor)) {
      return NextResponse.json(
        { success: false, error: 'Wajah Anda belum terdaftar di sistem. Silakan daftarkan wajah terlebih dahulu.' },
        { status: 400 }
      );
    }

    if (face_descriptor) {
      const faceVerification = verifyFaceDescriptors(face_descriptor, userRow.face_descriptor);
      if (!faceVerification.matched) {
        return NextResponse.json(
          { success: false, error: faceVerification.message },
          { status: 403 }
        );
      }
    }

    const today = todayISO();
    const now = new Date().toISOString();

    // Fetch today's check-in record
    const { data: record, error: fetchError } = await supabase
      .from('attendance')
      .select('id, check_in_time, check_out_time, notes')
      .eq('user_id', session.id)
      .eq('date', today)
      .single();

    if (fetchError || !record) {
      return NextResponse.json(
        { success: false, error: 'Tidak ditemukan data absen masuk hari ini. Silakan absen masuk terlebih dahulu.' },
        { status: 404 }
      );
    }

    if (record.check_out_time) {
      return NextResponse.json(
        { success: false, error: 'Anda sudah absen keluar hari ini.' },
        { status: 409 }
      );
    }

    if (!record.check_in_time) {
      return NextResponse.json(
        { success: false, error: 'Data absen masuk tidak valid.' },
        { status: 400 }
      );
    }

    // Load configurable work hours from settings (default: 08:30, max full-day in 10:30, end 16:00)
    const workHours = await getWorkHoursConfig(supabase);

    // Calculate status based on configured time thresholds
    const status = calculateAttendanceStatus(record.check_in_time, now, workHours);
    const attendanceCode = status === 'full_day' ? 'H' : '1/2';

    // Check if today is a weekend or registered national holiday (Lembur)
    const dow = dayOfWeekISO(today);
    const isWeekend = dow === 0 || dow === 6;
    const { holidays: todayHolidays } = await getHolidaysList(supabase, {
      startDate: today,
      endDate: today,
    });
    const isHoliday = todayHolidays.length > 0;
    const isOvertimeDay = isWeekend || isHoliday;

    // Update record with checkout time and computed status
    let updateRes = await supabase
      .from('attendance')
      .update({
        check_out_time: now,
        status,
        attendance_status: isOvertimeDay ? 'HL' : attendanceCode,
        ...(isOvertimeDay ? { is_overtime: true } : {}),
      })
      .eq('id', record.id)
      .select()
      .single();

    if (updateRes.error) {
      // Fallback if migration_v6 columns/constraint ('HL', 'is_overtime') are not yet applied in Supabase
      updateRes = await supabase
        .from('attendance')
        .update({
          check_out_time: now,
          status,
          attendance_status: attendanceCode,
          ...(isOvertimeDay && (!record.notes || !record.notes.includes('[LEMBUR]'))
            ? { notes: `[LEMBUR] ${record.notes || 'Hadir di hari libur/akhir pekan'}`.trim() }
            : {}),
        })
        .eq('id', record.id)
        .select()
        .single();
    }

    if (updateRes.error) throw updateRes.error;
    const updated = updateRes.data;

    const inWIB = toWIBTimeHHMM(record.check_in_time);
    const outWIB = toWIBTimeHHMM(now);

    return NextResponse.json({
      success: true,
      data: updated,
      message: isOvertimeDay
        ? `Absen keluar (Lembur) berhasil (${inWIB} - ${outWIB} WIB). Menunggu verifikasi HRD.`
        : `Absen keluar berhasil (${inWIB} - ${outWIB} WIB). Status hari ini: ${
            status === 'full_day' ? 'Satu Hari Penuh (Full Day)' : 'Setengah Hari (Half Day)'
          }.`,
    });

  } catch (error) {
    console.error('[/api/attendance/checkout] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
