/**
 * POST /api/attendance/checkin
 * Records a check-in event for the authenticated intern.
 * Validates: user is logged in, date not already checked in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { INTERN_PORTAL_ROLES } from '@/lib/permissions';
import { todayISO, dayOfWeekISO } from '@/lib/utils';
import { getHolidaysList } from '@/lib/work-config';

import { verifyFaceDescriptors } from '@/lib/face-math';

export async function POST(request: NextRequest) {
  try {
    // Only interns can check in
    const session = await requireRole(INTERN_PORTAL_ROLES);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Silakan login sebagai intern.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { lat, long, distance_from_office, face_descriptor } = body;

    if (lat == null || long == null || distance_from_office == null) {
      return NextResponse.json(
        { success: false, error: 'Data lokasi tidak lengkap.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const today = todayISO();
    const now = new Date().toISOString();

    // Verify user profile & registered face descriptor
    const { data: userRow } = await supabase
      .from('users')
      .select('status, face_descriptor')
      .eq('id', session.id)
      .single();

    if (!userRow?.face_descriptor || !Array.isArray(userRow.face_descriptor)) {
      return NextResponse.json(
        { success: false, error: 'Wajah Anda belum terdaftar di sistem. Silakan daftarkan wajah terlebih dahulu.' },
        { status: 400 }
      );
    }

    if (face_descriptor && Array.isArray(face_descriptor)) {
      const faceVerification = verifyFaceDescriptors(face_descriptor, userRow.face_descriptor);
      if (!faceVerification.matched) {
        return NextResponse.json(
          { success: false, error: faceVerification.message },
          { status: 403 }
        );
      }
    }

    // Check if already checked in today
    const { data: existing } = await supabase
      .from('attendance')
      .select('id, check_in_time, check_out_time')
      .eq('user_id', session.id)
      .eq('date', today)
      .single();

    if (existing?.check_in_time) {
      return NextResponse.json(
        { success: false, error: 'Anda sudah absen masuk hari ini.' },
        { status: 409 }
      );
    }

    // Check if today is a weekend (Saturday/Sunday) or registered national holiday
    const dow = dayOfWeekISO(today);
    const isWeekend = dow === 0 || dow === 6;
    const { holidays: todayHolidays } = await getHolidaysList(supabase, {
      startDate: today,
      endDate: today,
    });
    const isHoliday = todayHolidays.length > 0;
    const isOvertimeDay = isWeekend || isHoliday;
    const overtimeNote = isOvertimeDay
      ? `[LEMBUR] Hadir pada ${isHoliday ? todayHolidays[0].name : dow === 6 ? 'Hari Sabtu' : 'Hari Minggu'}`
      : null;

    const basePayload: Record<string, any> = {
      user_id: session.id,
      date: today,
      check_in_time: now,
      check_in_lat: parseFloat(lat),
      check_in_long: parseFloat(long),
      distance_from_office: parseFloat(distance_from_office),
      status: 'pending',
      is_perbantuan: userRow?.status === 'perbantuan',
      ...(overtimeNote ? { notes: overtimeNote } : {}),
    };

    // Try inserting with is_overtime column first (migration_v6), fallback cleanly if column not yet added
    let insertRes = await supabase
      .from('attendance')
      .insert({
        ...basePayload,
        ...(isOvertimeDay ? { is_overtime: true, overtime_approved: false } : {}),
      })
      .select()
      .single();

    if (insertRes.error && isOvertimeDay) {
      insertRes = await supabase
        .from('attendance')
        .insert(basePayload)
        .select()
        .single();
    }

    if (insertRes.error) throw insertRes.error;
    const data = insertRes.data;

    return NextResponse.json({
      success: true,
      data,
      message: isOvertimeDay
        ? `Absen masuk (Lembur) berhasil pada ${new Date(now).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB.`
        : `Absen masuk berhasil pada ${new Date(now).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB.`,
    });

  } catch (error) {
    console.error('[/api/attendance/checkin] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
