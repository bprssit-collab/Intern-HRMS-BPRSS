/**
 * POST /api/attendance/checkout
 * Records a check-out event. Automatically calculates and sets attendance status.
 * Status: >6 hours → full_day, ≤6 hours → half_day
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { calculateAttendanceStatus } from '@/lib/payout-calc';
import { INTERN_PORTAL_ROLES } from '@/lib/permissions';
import { todayISO } from '@/lib/utils';

export async function POST() {
  try {
    const session = await requireRole(INTERN_PORTAL_ROLES);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Silakan login sebagai intern.' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
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
