/**
 * /api/admin/users
 * Super Admin only: create, read, update (incl. role change) and delete user accounts.
 *
 *  GET     -> list all accounts + batches
 *  POST    -> create account
 *  PUT     -> update account (name, email, role, department, batch, status, optional new password)
 *  DELETE  -> delete account (?id=...). Attendance rows are removed through ON DELETE CASCADE.
 *
 * Safeguards: cannot delete / change role of yourself, cannot remove or demote the last Super Admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { ALL_ROLES, isValidRole } from '@/lib/permissions';
import type { UserRole } from '@/types';

const VALID_STATUS = ['active', 'perbantuan', 'completed'];
const MIN_PASSWORD_LENGTH = 6;

const forbidden = () =>
  NextResponse.json(
    { success: false, error: 'Akses ditolak. Fitur ini hanya dapat dilakukan oleh Super Admin.' },
    { status: 403 }
  );

const fail = (error: string, status = 400) =>
  NextResponse.json({ success: false, error }, { status });

async function countSuperAdmins(supabase: any): Promise<number> {
  const { data } = await supabase.from('users').select('id').eq('role', 'super_admin');
  return (data || []).length;
}

export async function GET() {
  try {
    const session = await requireRole('super_admin');
    if (!session) return forbidden();

    const supabase = createAdminClient();

    const [{ data: users, error }, { data: batches }] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, email, role, department, batch_id, status, face_descriptor, created_at')
        .order('created_at', { ascending: true }),
      supabase.from('batches').select('id, batch_number, name, is_active').order('batch_number', { ascending: false }),
    ]);

    if (error) throw error;

    const batchName = new Map<string, string>(((batches as any[]) || []).map((b) => [b.id, b.name]));

    const formatted = ((users as any[]) || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department || '',
      batch_id: u.batch_id || null,
      batch_name: u.batch_id ? batchName.get(u.batch_id) || '-' : '-',
      status: u.status || 'active',
      has_face: Array.isArray(u.face_descriptor) && u.face_descriptor.length > 0,
      created_at: u.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      batches: batches || [],
      currentUserId: session.id,
    });
  } catch (error: any) {
    console.error('[/api/admin/users GET] Error:', error);
    return fail(error.message || 'Terjadi kesalahan server.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('super_admin');
    if (!session) return forbidden();

    const body = await request.json();
    const { name, email, password, role, department, batch_id, status } = body;

    if (!name?.trim() || !email?.trim() || !password) {
      return fail('Nama, email, dan password wajib diisi.');
    }
    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return fail(`Password minimal ${MIN_PASSWORD_LENGTH} karakter.`);
    }
    if (!isValidRole(role)) {
      return fail(`Role tidak valid. Pilihan: ${ALL_ROLES.join(', ')}.`);
    }
    if (status !== undefined && !VALID_STATUS.includes(status)) {
      return fail('Status tidak valid.');
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      return fail('Email sudah terdaftar.', 409);
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const { data: created, error } = await supabase
      .from('users')
      .insert({
        name: String(name).trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        role,
        department: department || null,
        batch_id: batch_id || null,
        status: status || 'active',
        face_descriptor: null,
      })
      .select('id, name, email, role, department, batch_id, status')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: created,
      message: `Akun ${created.name} berhasil dibuat.`,
    });
  } catch (error: any) {
    console.error('[/api/admin/users POST] Error:', error);
    return fail(error.message || 'Terjadi kesalahan server.', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole('super_admin');
    if (!session) return forbidden();

    const body = await request.json();
    const { id, name, email, password, role, department, batch_id, status } = body;

    if (!id) return fail('ID pengguna diperlukan.');

    const supabase = createAdminClient();

    const { data: target } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .single();

    if (!target) return fail('Pengguna tidak ditemukan.', 404);

    const payload: Record<string, any> = {};

    if (name !== undefined) {
      if (!String(name).trim()) return fail('Nama tidak boleh kosong.');
      payload.name = String(name).trim();
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!normalizedEmail) return fail('Email tidak boleh kosong.');

      const { data: dup } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .neq('id', id)
        .single();
      if (dup) return fail('Email sudah digunakan akun lain.', 409);

      payload.email = normalizedEmail;
    }

    if (role !== undefined && role !== target.role) {
      if (!isValidRole(role)) return fail(`Role tidak valid. Pilihan: ${ALL_ROLES.join(', ')}.`);

      if (id === session.id) {
        return fail('Anda tidak dapat mengubah role akun Anda sendiri.');
      }
      if (target.role === 'super_admin' && (await countSuperAdmins(supabase)) <= 1) {
        return fail('Tidak dapat menurunkan role Super Admin terakhir.');
      }
      payload.role = role as UserRole;
    }

    if (department !== undefined) payload.department = department || null;
    if (batch_id !== undefined) payload.batch_id = batch_id || null;
    if (status !== undefined) {
      if (!VALID_STATUS.includes(status)) return fail('Status tidak valid.');
      payload.status = status;
    }

    if (password) {
      if (String(password).length < MIN_PASSWORD_LENGTH) {
        return fail(`Password minimal ${MIN_PASSWORD_LENGTH} karakter.`);
      }
      payload.password_hash = await bcrypt.hash(String(password), 10);
    }

    if (Object.keys(payload).length === 0) {
      return fail('Tidak ada perubahan yang dikirim.');
    }

    const { data: updated, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', id)
      .select('id, name, email, role, department, batch_id, status')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: updated,
      message: payload.role
        ? `Data ${updated.name} diperbarui. Role sekarang: ${payload.role}.`
        : `Data ${updated.name} berhasil diperbarui.`,
    });
  } catch (error: any) {
    console.error('[/api/admin/users PUT] Error:', error);
    return fail(error.message || 'Terjadi kesalahan server.', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRole('super_admin');
    if (!session) return forbidden();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return fail('ID pengguna diperlukan.');
    if (id === session.id) return fail('Anda tidak dapat menghapus akun Anda sendiri.');

    const supabase = createAdminClient();

    const { data: target } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('id', id)
      .single();

    if (!target) return fail('Pengguna tidak ditemukan.', 404);

    if (target.role === 'super_admin' && (await countSuperAdmins(supabase)) <= 1) {
      return fail('Tidak dapat menghapus Super Admin terakhir.');
    }

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Akun ${target.name} beserta data absensinya berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('[/api/admin/users DELETE] Error:', error);
    return fail(error.message || 'Terjadi kesalahan server.', 500);
  }
}
