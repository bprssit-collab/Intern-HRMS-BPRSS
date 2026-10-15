/**
 * GET /api/settings
 * Returns the office geofence settings (lat/long/radius). Pocket-money rates are NOT
 * part of settings anymore: they are configured per batch in Manajemen Batch.
 *
 * POST /api/settings
 * Updates geofence settings. Requires staf_hrd / kepala_hrd / super_admin
 * (intern_hrd is not allowed).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { MANAGER_ROLES } from '@/lib/permissions';

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

    // Only geofence data is exposed (needed by the attendance screen as well).
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
    const session = await requireRole(MANAGER_ROLES);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Hanya Staf HRD, Kepala HRD, atau Super Admin yang dapat mengubah pengaturan.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { office_lat, office_long, max_radius_meters } = body;

    // Validate required fields
    if (office_lat == null || office_long == null || max_radius_meters == null) {
      return NextResponse.json(
        { success: false, error: 'Semua field pengaturan wajib diisi.' },
        { status: 400 }
      );
    }

    const lat = parseFloat(office_lat);
    const long = parseFloat(office_long);
    const radius = parseInt(max_radius_meters);

    if (!isFinite(lat) || !isFinite(long) || !isFinite(radius) || radius <= 0) {
      return NextResponse.json(
        { success: false, error: 'Nilai koordinat atau radius tidak valid.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get existing settings ID (upsert to the singleton row)
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .single();

    const payload = {
      office_lat: lat,
      office_long: long,
      max_radius_meters: radius,
    };

    let result;
    if (existing) {
      result = await supabase
        .from('settings')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('settings')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    const saved = result.data;
    return NextResponse.json({
      success: true,
      data: {
        id: saved.id,
        office_lat: saved.office_lat,
        office_long: saved.office_long,
        max_radius_meters: saved.max_radius_meters,
        updated_at: saved.updated_at,
      },
    });

  } catch (error) {
    console.error('[/api/settings POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
