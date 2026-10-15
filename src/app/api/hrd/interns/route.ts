/**
 * /api/hrd/interns
 * HRD-portal endpoint (intern_hrd, staf_hrd, kepala_hrd, super_admin) for viewing and managing
 * the intern list, departments, and status (active/perbantuan/completed).
 * Lists accounts with role 'intern' and 'intern_hrd' (both are interns who attend).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { HRD_PORTAL_ROLES, ATTENDEE_ROLES } from '@/lib/permissions';
import bcrypt from 'bcryptjs';

const forbidden = () =>
  NextResponse.json(
    { success: false, error: 'Akses ditolak. Khusus HRD.' },
    { status: 403 }
  );

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(HRD_PORTAL_ROLES);
    if (!session) return forbidden();

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    const supabase = createAdminClient();

    // Fetch batches for batch map (is_active is used by the UI to pick the default filter)
    const { data: batchesData } = await supabase
      .from('batches')
      .select('id, batch_number, name, is_active')
      .order('batch_number', { ascending: false });
    const batchMap = new Map<string, string>();
    for (const b of (batchesData || [])) {
      batchMap.set(b.id, b.name);
    }

    let query = supabase
      .from('users')
      .select('id, name, email, role, department, batch_id, status, face_descriptor, created_at')
      .in('role', ATTENDEE_ROLES);

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    const { data: interns, error } = await query;
    if (error) throw error;

    const formatted = ((interns as any[]) || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department || 'Umum',
      batch_id: u.batch_id,
      batch_name: u.batch_id ? batchMap.get(u.batch_id) || '-' : '-',
      status: u.status || 'active',
      has_face: Array.isArray(u.face_descriptor) && u.face_descriptor.length > 0,
      created_at: u.created_at,
    }));

    // Sort by department, then by name
    formatted.sort((a, b) => {
      const d = (a.department || '').localeCompare(b.department || '');
      return d !== 0 ? d : a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      success: true,
      data: formatted,
      batches: batchesData || [],
    });
  } catch (error: any) {
    console.error('[/api/hrd/interns GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(HRD_PORTAL_ROLES);
    if (!session) return forbidden();

    const body = await request.json();
    const { name, email, department, batch_id, status, password } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Nama dan email wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check duplicate email
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email sudah terdaftar.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password || 'intern123', 10);

    const { data: newIntern, error } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: 'intern',
        department: department || 'CS',
        batch_id: batch_id || null,
        status: status || 'active',
        face_descriptor: null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: newIntern,
      message: 'Anak magang baru berhasil ditambahkan.',
    });
  } catch (error: any) {
    console.error('[/api/hrd/interns POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole(HRD_PORTAL_ROLES);
    if (!session) return forbidden();

    const body = await request.json();
    const { id, name, email, department, batch_id, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID intern diperlukan.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // This endpoint only manages intern accounts - never HRD/admin accounts.
    const { data: target } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .single();

    if (!target || !ATTENDEE_ROLES.includes(target.role)) {
      return NextResponse.json(
        { success: false, error: 'Data anak magang tidak ditemukan.' },
        { status: 404 }
      );
    }

    const payload: any = {};
    if (name) payload.name = name.trim();
    if (email) payload.email = email.trim().toLowerCase();
    if (department !== undefined) payload.department = department;
    if (batch_id !== undefined) payload.batch_id = batch_id;
    if (status !== undefined) payload.status = status;

    const { data: updated, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Data anak magang berhasil diperbarui.',
    });
  } catch (error: any) {
    console.error('[/api/hrd/interns PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
