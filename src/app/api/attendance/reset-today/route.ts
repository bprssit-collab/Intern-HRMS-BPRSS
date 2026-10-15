/**
 * POST /api/attendance/reset-today
 * Deletes today's attendance record for the current intern so they can re-test check-in and check-out.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { INTERN_PORTAL_ROLES } from '@/lib/permissions';
import { todayISO } from '@/lib/utils';

export async function POST() {
  try {
    const session = await getSession();

    if (!session || !INTERN_PORTAL_ROLES.includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki izin.' },
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
      message: 'Data absensi hari ini berhasil di-reset untuk pengujian.',
    });
  } catch (error) {
    console.error('[/api/attendance/reset-today] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mereset absensi hari ini.' },
      { status: 500 }
    );
  }
}
