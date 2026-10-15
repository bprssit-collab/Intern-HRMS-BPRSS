/**
 * POST /api/attendance/checkout
 * Records a check-out event. Automatically calculates and sets attendance status.
 * Status: >6 hours → full_day, ≤6 hours → half_day
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { calculateAttendanceStatus } from '@/lib/payout-calc';
import { INTERN_PORTAL_ROLES } from '@/lib/permissions';
import { todayISO } from '@/lib/utils';
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
      .select('id, check_in_time, check_out_time')
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

    // Calculate status based on hours worked
    const status = calculateAttendanceStatus(record.check_in_time, now);

    // Update record with checkout time and computed status
    const { data: updated, error: updateError } = await supabase
      .from('attendance')
      .update({
        check_out_time: now,
        status,
      })
      .eq('id', record.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Absen keluar berhasil. Status hari ini: ${status === 'full_day' ? 'Penuh' : 'Setengah'}.`,
    });

  } catch (error) {
    console.error('[/api/attendance/checkout] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
