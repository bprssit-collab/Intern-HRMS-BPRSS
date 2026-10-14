/**
 * GET /api/hrd/payout
 * HRD-ONLY endpoint. Returns payout summary for all interns in a date range.
 * Requires 'hrd' role. Never accessible to interns.
 * 
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { calculatePayouts } from '@/lib/payout-calc';
import type { User, Attendance } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Strict HRD-only access
    const session = await requireRole('hrd');
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Hanya HRD yang dapat melihat data payout.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Parameter startDate dan endDate diperlukan.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch all attendance records in the date range
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .not('check_out_time', 'is', null); // Only completed days

    if (attendanceError) throw attendanceError;

    // Fetch all intern users for name lookup
    const { data: internUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role, department, status')
      .eq('role', 'intern');

    if (usersError) throw usersError;

    // Fetch current settings for rates
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('full_day_rate, half_day_rate, perbantuan_full_day_rate, perbantuan_half_day_rate')
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { success: false, error: 'Pengaturan tarif tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Build user lookup map
    const userMap = new Map<string, User>();
    for (const user of (internUsers ?? [])) {
      userMap.set(user.id, user as User);
    }

    // Calculate payouts
    const payouts = calculatePayouts(
      (attendanceRecords as Attendance[]) ?? [],
      userMap,
      settings.full_day_rate,
      settings.half_day_rate,
      settings.perbantuan_full_day_rate ?? 75000,
      settings.perbantuan_half_day_rate ?? 37500
    );

    return NextResponse.json({
      success: true,
      data: {
        payouts,
        settings: {
          full_day_rate: settings.full_day_rate,
          half_day_rate: settings.half_day_rate,
          perbantuan_full_day_rate: settings.perbantuan_full_day_rate ?? 75000,
          perbantuan_half_day_rate: settings.perbantuan_half_day_rate ?? 37500,
        },
        period: { startDate, endDate },
      },
    });

  } catch (error) {
    console.error('[/api/hrd/payout] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
