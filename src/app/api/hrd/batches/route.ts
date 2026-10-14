/**
 * /api/hrd/batches
 * HRD-only endpoint for Managing Internship Batches (e.g. Batch 15, duration, rates).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import type { Batch } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('hrd');
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Khusus HRD.' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const { data: batches, error } = await supabase
      .from('batches')
      .select('*')
      .order('batch_number', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: (batches as Batch[]) || [],
    });
  } catch (error: any) {
    console.error('[/api/hrd/batches GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('hrd');
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Khusus HRD.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      batch_number,
      name,
      start_date,
      end_date,
      is_active,
      full_day_rate,
      half_day_rate,
      perbantuan_full_day_rate,
      perbantuan_half_day_rate,
    } = body;

    if (!batch_number || !name || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'Nomor batch, nama, tanggal mulai dan tanggal selesai wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // If marked active, deactivate other batches
    if (is_active) {
      const { data: allBatches } = await supabase.from('batches').select('id');
      for (const b of (allBatches || [])) {
        if (!id || b.id !== id) {
          await supabase.from('batches').update({ is_active: false }).eq('id', b.id);
        }
      }
    }

    const payload = {
      batch_number: Number(batch_number),
      name: String(name),
      start_date: String(start_date),
      end_date: String(end_date),
      is_active: Boolean(is_active),
      full_day_rate: Number(full_day_rate || 50000),
      half_day_rate: Number(half_day_rate || 25000),
      perbantuan_full_day_rate: Number(perbantuan_full_day_rate || 75000),
      perbantuan_half_day_rate: Number(perbantuan_half_day_rate || 37500),
    };

    let result;
    if (id) {
      // Update existing
      result = await supabase
        .from('batches')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
    } else {
      // Create new
      result = await supabase
        .from('batches')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json({
      success: true,
      data: result.data,
      message: id ? 'Data batch berhasil diperbarui.' : 'Batch baru berhasil ditambahkan.',
    });
  } catch (error: any) {
    console.error('[/api/hrd/batches POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
