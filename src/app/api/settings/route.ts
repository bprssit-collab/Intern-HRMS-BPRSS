/**
 * GET /api/settings
 * Returns current office settings.
 * Note: full_day_rate and half_day_rate are included for HRD use;
 * the HRD module must restrict display of rates to authorized views only.
 * 
 * POST /api/settings
 * Updates settings. Requires HRD role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole, getSession } from '@/lib/auth';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Pengaturan tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Check if caller is HRD - if not, strip financial data
    const session = await getSession();
    if (!session || session.role !== 'hrd') {
      // Return only geofence data for intern/unauthenticated requests
      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          office_lat: data.office_lat,
          office_long: data.office_long,
          max_radius_meters: data.max_radius_meters,
          updated_at: data.updated_at,
        },
      });
    }

    // HRD gets full settings including financial rates
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('[/api/settings GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require HRD role for settings updates
    const session = await requireRole('hrd');
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Hanya HRD yang dapat mengubah pengaturan.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      office_lat,
      office_long,
      max_radius_meters,
      full_day_rate,
      half_day_rate,
    } = body;

    // Validate required fields
    if (
      office_lat == null || office_long == null ||
      max_radius_meters == null || full_day_rate == null || half_day_rate == null
    ) {
      return NextResponse.json(
        { success: false, error: 'Semua field pengaturan wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get existing settings ID (upsert to the singleton row)
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('settings')
        .update({
          office_lat: parseFloat(office_lat),
          office_long: parseFloat(office_long),
          max_radius_meters: parseInt(max_radius_meters),
          full_day_rate: parseInt(full_day_rate),
          half_day_rate: parseInt(half_day_rate),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('settings')
        .insert({
          office_lat: parseFloat(office_lat),
          office_long: parseFloat(office_long),
          max_radius_meters: parseInt(max_radius_meters),
          full_day_rate: parseInt(full_day_rate),
          half_day_rate: parseInt(half_day_rate),
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json({ success: true, data: result.data });

  } catch (error) {
    console.error('[/api/settings POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
