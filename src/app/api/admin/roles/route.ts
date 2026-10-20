import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { HRD_PORTAL_ROLES } from '@/lib/permissions';
import type { RoleItem } from '@/types';

const DEFAULT_CORE_ROLES: RoleItem[] = [
  {
    id: 'core-super-admin',
    key: 'super_admin',
    label: 'Super Admin',
    badge: 'SUPER ADMIN',
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description:
      'Administrator tingkat tertinggi dengan kontrol penuh atas seluruh akun, divisi, role, batch, audit sistem, dan bypass batasan edit absensi.',
    portal_access: 'hrd',
    is_system: true,
    permissions: {
      manage_users: true,
      manage_departments: true,
      manage_roles: true,
      manage_batches: true,
      view_attendance_history: true,
      edit_attendance: 'unlimited',
      reset_face: true,
      payout_access: true,
      payout_approval: true,
      must_attend: false,
    },
  },
  {
    id: 'core-kepala-hrd',
    key: 'kepala_hrd',
    label: 'Kepala HRD',
    badge: 'KEPALA HRD',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description:
      'Pimpinan divisi SDM / HRD dengan wewenang persetujuan (approval) rekapitulasi uang saku, monitoring riwayat absensi, dan koreksi izin absensi.',
    portal_access: 'hrd',
    is_system: true,
    permissions: {
      manage_users: false,
      manage_departments: false,
      manage_roles: false,
      manage_batches: true,
      view_attendance_history: true,
      edit_attendance: 'once',
      reset_face: false,
      payout_access: true,
      payout_approval: true,
      must_attend: false,
    },
  },
  {
    id: 'core-staf-hrd',
    key: 'staf_hrd',
    label: 'Staf HRD',
    badge: 'STAF HRD',
    color: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    description:
      'Staf operasional HRD yang mengelola batch, rekapitulasi kehadiran, penginputan izin/sakit anak magang, dan operasional harian.',
    portal_access: 'hrd',
    is_system: true,
    permissions: {
      manage_users: false,
      manage_departments: false,
      manage_roles: false,
      manage_batches: true,
      view_attendance_history: true,
      edit_attendance: 'once',
      reset_face: false,
      payout_access: true,
      payout_approval: false,
      must_attend: false,
    },
  },
  {
    id: 'core-intern-hrd',
    key: 'intern_hrd',
    label: 'Intern HRD (SDM)',
    badge: 'INTERN HRD',
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description:
      'Anak magang yang ditempatkan khusus di bagian SDM. Memiliki hak akses ganda: wajib absen wajah dan dapat memonitor portal HRD secara terbatas.',
    portal_access: 'both',
    is_system: true,
    permissions: {
      manage_users: false,
      manage_departments: false,
      manage_roles: false,
      manage_batches: false,
      view_attendance_history: false,
      edit_attendance: 'notes_only',
      reset_face: false,
      payout_access: false,
      payout_approval: false,
      must_attend: true,
    },
  },
  {
    id: 'core-intern',
    key: 'intern',
    label: 'Intern Biasa',
    badge: 'INTERN',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description:
      'Peserta magang reguler yang hanya memiliki akses ke portal intern pribadi untuk rekam wajah, absen masuk/pulang, dan histori kehadiran mandiri.',
    portal_access: 'intern',
    is_system: true,
    permissions: {
      manage_users: false,
      manage_departments: false,
      manage_roles: false,
      manage_batches: false,
      view_attendance_history: false,
      edit_attendance: 'none',
      reset_face: false,
      payout_access: false,
      payout_approval: false,
      must_attend: true,
    },
  },
];

const forbidden = (msg = 'Akses ditolak.') =>
  NextResponse.json({ success: false, error: msg }, { status: 403 });

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(HRD_PORTAL_ROLES);
    if (!session) return forbidden('Akses ditolak. Khusus HRD dan Super Admin.');

    const supabase = createAdminClient();

    // 1. Hitung jumlah user per role
    const { data: usersData } = await supabase.from('users').select('role');
    const userCountMap: Record<string, number> = {};
    (usersData || []).forEach((u: any) => {
      if (u.role) {
        userCountMap[u.role] = (userCountMap[u.role] || 0) + 1;
      }
    });

    // 2. Ambil dari tabel roles
    const { data: rolesData, error } = await supabase
      .from('roles')
      .select('*')
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[/api/admin/roles GET] Tabel roles belum ada di Supabase, menggunakan data default.', error.message);
      const fallbackList = DEFAULT_CORE_ROLES.map((r) => ({
        ...r,
        user_count: userCountMap[r.key] || 0,
      }));
      return NextResponse.json({
        success: true,
        data: fallbackList,
        is_fallback: true,
      });
    }

    const formatted = (rolesData || []).map((r: any) => ({
      ...r,
      user_count: userCountMap[r.key] || 0,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      is_fallback: false,
    });
  } catch (error: any) {
    console.error('[/api/admin/roles GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['super_admin']);
    if (!session) return forbidden('Hanya Super Admin yang dapat menambahkan role baru.');

    const body = await request.json();
    const { key, label, badge, color, description, portal_access, permissions } = body;

    const cleanKey = (key || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const cleanLabel = (label || '').trim();
    const cleanBadge = (badge || cleanLabel || '').trim().toUpperCase();

    if (!cleanKey || cleanKey.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Key role wajib diisi (minimal 3 karakter huruf kecil/garis bawah, contoh: staf_operasional).' },
        { status: 400 }
      );
    }

    if (!cleanLabel) {
      return NextResponse.json({ success: false, error: 'Nama label role wajib diisi.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Cek duplikasi key
    const { data: existing, error: checkErr } = await supabase
      .from('roles')
      .select('id, key')
      .eq('key', cleanKey)
      .maybeSingle();

    if (checkErr && checkErr.code === 'PGRST205') {
      return NextResponse.json(
        {
          success: false,
          error: 'Tabel roles belum dibuat di Supabase. Mohon jalankan skrip migration_v5_roles.sql terlebih dahulu di SQL Editor.',
        },
        { status: 400 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Role dengan key "${cleanKey}" sudah ada.` },
        { status: 409 }
      );
    }

    const { data: created, error: insertErr } = await supabase
      .from('roles')
      .insert({
        key: cleanKey,
        label: cleanLabel,
        badge: cleanBadge,
        color: color || 'bg-slate-500/20 text-slate-300 border-slate-500/40',
        description: (description || '').trim() || null,
        portal_access: portal_access || 'hrd',
        is_system: false,
        permissions: permissions || {},
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({
      success: true,
      data: created,
      message: `Role "${cleanLabel}" berhasil ditambahkan.`,
    });
  } catch (error: any) {
    console.error('[/api/admin/roles POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole(['super_admin']);
    if (!session) return forbidden('Hanya Super Admin yang dapat mengubah role.');

    const body = await request.json();
    const { id, label, badge, color, description, portal_access, permissions } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID role diperlukan.' }, { status: 400 });
    }

    const cleanLabel = (label || '').trim();
    if (!cleanLabel) {
      return NextResponse.json({ success: false, error: 'Nama label role wajib diisi.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: existing, error: fetchErr } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ success: false, error: 'Role tidak ditemukan.' }, { status: 404 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('roles')
      .update({
        label: cleanLabel,
        badge: (badge || cleanLabel).trim().toUpperCase(),
        color: color || existing.color,
        description: (description || '').trim() || null,
        portal_access: portal_access || existing.portal_access,
        permissions: permissions !== undefined ? permissions : existing.permissions,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Role "${cleanLabel}" berhasil diperbarui.`,
    });
  } catch (error: any) {
    console.error('[/api/admin/roles PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRole(['super_admin']);
    if (!session) return forbidden('Hanya Super Admin yang dapat menghapus role.');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID role diperlukan.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: role, error: fetchErr } = await supabase
      .from('roles')
      .select('id, key, label, is_system')
      .eq('id', id)
      .single();

    if (fetchErr || !role) {
      return NextResponse.json({ success: false, error: 'Role tidak ditemukan.' }, { status: 404 });
    }

    if (role.is_system) {
      return NextResponse.json(
        { success: false, error: `Role bawaan sistem "${role.label}" tidak dapat dihapus demi keamanan operasional.` },
        { status: 400 }
      );
    }

    // Cek apakah masih ada user yang memegang role ini
    const { count: userCount, error: countErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', role.key);

    if (countErr) throw countErr;

    if (userCount && userCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Tidak dapat menghapus role "${role.label}" karena masih digunakan oleh ${userCount} akun pengguna. Pindahkan role akun tersebut terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    const { error: deleteErr } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({
      success: true,
      message: `Role "${role.label}" berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('[/api/admin/roles DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
