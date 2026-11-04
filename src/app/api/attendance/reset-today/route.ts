/**
 * POST /api/attendance/reset-today
 * Super Admin only: Deletes today's attendance record for the current user.
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { todayISO } from '@/lib/utils';

export async function POST() {
  try {
    const session = await requireRole('super_admin');

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Hanya Super Admin yang dapat mereset absensi.' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const today = todayISO();

    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('user_id', session.id)
      .eq('date', today);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Data absensi hari ini berhasil di-reset.',
    });
  } catch (error) {
    console.error('[/api/attendance/reset-today] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mereset absensi hari ini.' },
      { status: 500 }
    );
  }
}
