/**
 * GET /api/admin/work-hours
 * Returns the configured attendance time boundaries:
 * - work_start_time (default '08:30')
 * - full_day_max_in (default '10:30')
 * - work_end_time   (default '16:00')
 *
 * POST /api/admin/work-hours
 * Updates the attendance time boundaries. Restricted to super_admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getSession } from '@/lib/auth';
import { getWorkHoursConfig, saveWorkHoursConfig } from '@/lib/work-config';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const config = await getWorkHoursConfig();
    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error('[/api/admin/work-hours GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat pengaturan jam absen.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('super_admin');
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses ditolak. Hanya Super Admin yang dapat mengubah Pengaturan Jam Absen.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const work_start_time = String(body.work_start_time || '').trim().replace('.', ':');
    const full_day_max_in = String(body.full_day_max_in || '').trim().replace('.', ':');
    const work_end_time = String(body.work_end_time || '').trim().replace('.', ':');

    if (
      !TIME_REGEX.test(work_start_time) ||
      !TIME_REGEX.test(full_day_max_in) ||
      !TIME_REGEX.test(work_end_time)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Format jam harus HH:MM (24 jam), contoh: 08:30, 10:30, 16:00.',
        },
        { status: 400 }
      );
    }

    if (work_start_time > full_day_max_in) {
      return NextResponse.json(
        {
          success: false,
          error: 'Jam Masuk Standar tidak boleh lebih besar dari Batas Maksimal Jam Masuk Full Day.',
        },
        { status: 400 }
      );
    }

    if (full_day_max_in >= work_end_time) {
      return NextResponse.json(
        {
          success: false,
          error: 'Batas Maksimal Jam Masuk Full Day harus lebih awal daripada Jam Pulang Minimal.',
        },
        { status: 400 }
      );
    }

    const saved = await saveWorkHoursConfig({
      work_start_time,
      full_day_max_in,
      work_end_time,
    });

    return NextResponse.json({
      success: true,
      data: saved,
      message: 'Pengaturan periode jam absen berhasil disimpan.',
    });
  } catch (error: any) {
    console.error('[/api/admin/work-hours POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan pengaturan jam absen.' },
      { status: 500 }
    );
  }
}

