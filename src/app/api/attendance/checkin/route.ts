/**
 * POST /api/attendance/checkin
 * Records a check-in event for the authenticated intern.
 * Validates: user is logged in, date not already checked in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { todayISO } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // Only interns can check in
    const session = await requireRole('intern');
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Silakan login sebagai intern.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { lat, long, distance_from_office } = body;

    if (lat == null || long == null || distance_from_office == null) {
      return NextResponse.json(
        { success: false, error: 'Data lokasi tidak lengkap.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const today = todayISO();
    const now = new Date().toISOString();

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

    // Insert new attendance record
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        user_id: session.id,
        date: today,
        check_in_time: now,
        check_in_lat: parseFloat(lat),
        check_in_long: parseFloat(long),
        distance_from_office: parseFloat(distance_from_office),
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: `Absen masuk berhasil pada ${new Date(now).toLocaleTimeString('id-ID')}.`,
    });

  } catch (error) {
    console.error('[/api/attendance/checkin] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
