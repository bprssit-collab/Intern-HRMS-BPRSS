/**
 * GET /api/hrd/payout
 * Manager-only endpoint (staf_hrd, kepala_hrd, super_admin). Returns the payout summary for
 * all interns in a date range. NOT accessible to intern_hrd or interns.
 *
 * Rates come from each intern's own batch (Manajemen Batch).
 *
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { MANAGER_ROLES, ATTENDEE_ROLES } from '@/lib/permissions';
import { calculatePayouts, type PayoutRates } from '@/lib/payout-calc';
import type { User, Attendance, Batch } from '@/types';

/** Rates used only when an intern has no batch and there is no active batch either. */
const FALLBACK_RATES: PayoutRates = {
  full: 20000,
  half: 10000,
  perbantuanFull: 50000,
  perbantuanHalf: 25000,
};

function batchToRates(batch: Batch): PayoutRates {
  return {
    full: batch.full_day_rate,
    half: batch.half_day_rate,
    perbantuanFull: batch.perbantuan_full_day_rate,
    perbantuanHalf: batch.perbantuan_half_day_rate,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Strict manager-only access (intern_hrd is excluded)
    const session = await requireRole(MANAGER_ROLES);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Hanya Staf HRD, Kepala HRD, dan Super Admin yang dapat melihat data uang saku.' },
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

    // Fetch all attending interns (intern + intern_hrd) for name lookup
    const { data: internUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role, department, status, batch_id')
      .in('role', ATTENDEE_ROLES);

    if (usersError) throw usersError;

    // Fetch batches (rates are defined per batch)
    const { data: batchRows, error: batchError } = await supabase
      .from('batches')
      .select('*');

    if (batchError) throw batchError;

    const batches = (batchRows as Batch[]) ?? [];
    const activeBatch = batches.find((b) => b.is_active) ?? batches[0];
    const fallbackRates = activeBatch ? batchToRates(activeBatch) : FALLBACK_RATES;
    const batchById = new Map<string, Batch>(batches.map((b) => [b.id, b]));

    // Build user lookup + per-user rate maps
    const userMap = new Map<string, User>();
    const ratesByUser = new Map<string, PayoutRates>();
    for (const user of (internUsers ?? []) as (User & { batch_id?: string })[]) {
      userMap.set(user.id, user as User);
      const batch = user.batch_id ? batchById.get(user.batch_id) : undefined;
      ratesByUser.set(user.id, batch ? batchToRates(batch) : fallbackRates);
    }

    // Calculate payouts
    const payouts = calculatePayouts(
      (attendanceRecords as Attendance[]) ?? [],
      userMap,
      fallbackRates.full,
      fallbackRates.half,
      fallbackRates.perbantuanFull,
      fallbackRates.perbantuanHalf,
      ratesByUser
    );

    return NextResponse.json({
      success: true,
      data: {
        payouts,
        // Rates of the active batch, shown as a reference note on the report
        settings: {
          full_day_rate: fallbackRates.full,
          half_day_rate: fallbackRates.half,
          perbantuan_full_day_rate: fallbackRates.perbantuanFull,
          perbantuan_half_day_rate: fallbackRates.perbantuanHalf,
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
