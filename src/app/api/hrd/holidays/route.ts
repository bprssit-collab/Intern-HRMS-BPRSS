/**
 * /api/hrd/holidays
 * Endpoint for managing National Holidays & Cuti Bersama (Hari Libur Nasional).
 * Accessible to MANAGER_ROLES: super_admin, kepala_hrd, staf_hrd.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { HRD_PORTAL_ROLES, MANAGER_ROLES } from '@/lib/permissions';
import {
  getHolidaysList,
  upsertHolidayItem,
  bulkUpsertHolidays,
  deleteHolidayItem,
} from '@/lib/work-config';
import { addDaysISO, dayOfWeekISO } from '@/lib/utils';
import type { Batch, HolidayType } from '@/types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TYPES: HolidayType[] = ['national', 'cuti_bersama', 'company'];

export function computeBatchWorkingDaysSummary(
  startDate: string,
  endDate: string,
  holidayDatesSet: Set<string>
) {
  let totalCalendarDays = 0;
  let weekendDays = 0;
  let weekdayHolidayDays = 0;
  let weekendHolidayDays = 0;

  let curr = startDate;
  let guard = 0;
  while (curr <= endDate && guard <= 1000) {
    totalCalendarDays += 1;
    const dow = dayOfWeekISO(curr);
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = holidayDatesSet.has(curr);

    if (isWeekend) {
      weekendDays += 1;
      if (isHoliday) weekendHolidayDays += 1;
    } else if (isHoliday) {
      weekdayHolidayDays += 1;
    }

    curr = addDaysISO(curr, 1);
    guard += 1;
  }

  const effectiveWorkingDays = Math.max(
    0,
    totalCalendarDays - weekendDays - weekdayHolidayDays
  );

  return {
    total_calendar_days: totalCalendarDays,
    weekend_days: weekendDays,
    weekday_holiday_days: weekdayHolidayDays,
    weekend_holiday_days: weekendHolidayDays,
    effective_working_days: effectiveWorkingDays,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(MANAGER_ROLES);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Khusus Staf HRD, Kepala HRD, dan Super Admin.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const batchId = searchParams.get('batchId') || undefined;

    const supabase = createAdminClient();
    const { holidays, is_fallback } = await getHolidaysList(supabase, {
      year,
      startDate,
      endDate,
    });

    // Also fetch batches to calculate effective working days summary for active/selected batch
    const { data: batchesData } = await supabase
      .from('batches')
      .select('*')
      .order('batch_number', { ascending: false });

    const batches = (batchesData as Batch[]) || [];
    const targetBatch =
      (batchId && batches.find((b) => b.id === batchId)) ||
      batches.find((b) => b.is_active) ||
      batches[0] ||
      null;

    let batchSummary = null;
    if (targetBatch) {
      const { holidays: allBatchHolidays } = await getHolidaysList(supabase, {
        startDate: targetBatch.start_date,
        endDate: targetBatch.end_date,
      });
      const holidaySet = new Set(allBatchHolidays.map((h) => h.date));
      batchSummary = {
        batch: targetBatch,
        ...computeBatchWorkingDaysSummary(
          targetBatch.start_date,
          targetBatch.end_date,
          holidaySet
        ),
      };
    }

    return NextResponse.json({
      success: true,
      data: holidays,
      batches,
      batchSummary,
      is_fallback,
    });
  } catch (error: any) {
    console.error('[/api/hrd/holidays GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat daftar hari libur.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(MANAGER_ROLES);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses ditolak. Hanya Super Admin, Kepala HRD, dan Staf HRD yang dapat mengelola hari libur.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Support bulk insertion if body has `items` array
    if (Array.isArray(body.items)) {
      const rawItems = body.items;
      const validItems: { date: string; name: string; type: HolidayType; created_by?: string }[] = [];

      for (const item of rawItems) {
        const d = String(item.date || '').trim();
        const n = String(item.name || '').trim();
        const t = (item.type || 'national') as HolidayType;

        if (ISO_DATE.test(d) && n && VALID_TYPES.includes(t)) {
          validItems.push({
            date: d,
            name: n,
            type: t,
            created_by: session.id,
          });
        }
      }

      if (validItems.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Tidak ada data hari libur yang valid untuk disimpan.' },
          { status: 400 }
        );
      }

      const result = await bulkUpsertHolidays(validItems);

      return NextResponse.json({
        success: true,
        count: result.count,
        data: result.saved,
        message: `Berhasil menambahkan/memperbarui ${result.count} hari libur secara massal.`,
      });
    }

    const date = String(body.date || '').trim();
    const name = String(body.name || '').trim();
    const type = (body.type || 'national') as HolidayType;

    if (!ISO_DATE.test(date) || !name) {
      return NextResponse.json(
        { success: false, error: 'Tanggal (YYYY-MM-DD) dan nama hari libur wajib diisi.' },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Jenis hari libur tidak valid.' },
        { status: 400 }
      );
    }

    const saved = await upsertHolidayItem({
      date,
      name,
      type,
      created_by: session.id,
    });

    return NextResponse.json({
      success: true,
      data: saved,
      message: 'Hari libur berhasil disimpan.',
    });
  } catch (error: any) {
    console.error('[/api/hrd/holidays POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan hari libur.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole(MANAGER_ROLES);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses ditolak. Hanya Super Admin, Kepala HRD, dan Staf HRD yang dapat mengubah hari libur.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const id = body.id ? String(body.id) : undefined;
    const date = String(body.date || '').trim();
    const name = String(body.name || '').trim();
    const type = (body.type || 'national') as HolidayType;

    if (!ISO_DATE.test(date) || !name) {
      return NextResponse.json(
        { success: false, error: 'Tanggal dan nama hari libur wajib diisi.' },
        { status: 400 }
      );
    }

    const saved = await upsertHolidayItem({
      id,
      date,
      name,
      type,
      created_by: session.id,
    });

    return NextResponse.json({
      success: true,
      data: saved,
      message: 'Data hari libur berhasil diperbarui.',
    });
  } catch (error: any) {
    console.error('[/api/hrd/holidays PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui hari libur.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRole(MANAGER_ROLES);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses ditolak. Hanya Super Admin, Kepala HRD, dan Staf HRD yang dapat menghapus hari libur.',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('date');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID atau tanggal hari libur wajib disertakan.' },
        { status: 400 }
      );
    }

    await deleteHolidayItem(id);

    return NextResponse.json({
      success: true,
      message: 'Hari libur berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('[/api/hrd/holidays DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus hari libur.' },
      { status: 500 }
    );
  }
}

