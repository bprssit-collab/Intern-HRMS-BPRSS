/**
 * GET /api/attendance/my-history
 * Returns the authenticated intern's attendance history.
 * STRICT: Returns ONLY non-financial fields (date, times, status).
 * No rates or pocket money amounts are ever included.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { INTERN_PORTAL_ROLES } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(INTERN_PORTAL_ROLES);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '30');

    const supabase = createAdminClient();

    // Select ONLY non-financial columns — enforces financial data isolation
    const { data, error } = await supabase
      .from('attendance')
      .select('id, user_id, date, check_in_time, check_out_time, distance_from_office, status, created_at')
      .eq('user_id', session.id)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });

  } catch (error) {
    console.error('[/api/attendance/my-history] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
