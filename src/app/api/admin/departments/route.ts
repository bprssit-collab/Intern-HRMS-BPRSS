import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';
import { HRD_PORTAL_ROLES } from '@/lib/permissions';

const DEFAULT_FALLBACK_DEPARTMENTS = [
  { name: 'CS', description: 'Customer Service & Pelayanan Nasabah' },
  { name: 'Teller UNPAM', description: 'Kasir dan Layanan Teller Kantor Kas UNPAM' },
  { name: 'SDM', description: 'Sumber Daya Manusia & HRD' },
  { name: 'Accounting', description: 'Akuntansi, Pembukuan & Keuangan' },
  { name: 'Kepatuhan', description: 'Kepatuhan Regulasi & Manajemen Risiko' },
  { name: 'Kredit', description: 'Analisis dan Administrasi Pembiayaan / Kredit' },
  { name: 'Audit', description: 'Internal Audit, Kontrol & Pengawasan' },
  { name: 'Social Media', description: 'Pemasaran Digital, Desain Kreatif & Media Sosial' },
  { name: 'Operasional', description: 'Operasional Kantor & Layanan Kas' },
  { name: 'IT', description: 'Teknologi Informasi, Pemrograman & Jaringan' },
  { name: 'Umum', description: 'Fasilitas, Logistik & Bagian Umum' },
];

const forbidden = (msg = 'Akses ditolak.') =>
  NextResponse.json({ success: false, error: msg }, { status: 403 });

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(HRD_PORTAL_ROLES);
    if (!session) return forbidden('Akses ditolak. Khusus HRD dan Super Admin.');

    const supabase = createAdminClient();

    // 1. Ambil data hitungan user per divisi
    const { data: usersData } = await supabase
      .from('users')
      .select('department');

    const userCountMap: Record<string, number> = {};
    (usersData || []).forEach((u: any) => {
      if (u.department) {
        userCountMap[u.department] = (userCountMap[u.department] || 0) + 1;
      }
    });

    // 2. Coba ambil dari tabel departments
    const { data: deptData, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      // Jika tabel departments belum dibuat di Supabase (PGRST205), gunakan fallback default
      console.warn('[/api/admin/departments GET] Tabel departments belum ada, menggunakan data default.', error.message);
      const fallbackList = DEFAULT_FALLBACK_DEPARTMENTS.map((d, idx) => ({
        id: `default-${idx + 1}`,
        name: d.name,
        code: null,
        description: d.description,
        user_count: userCountMap[d.name] || 0,
        created_at: new Date().toISOString(),
      }));

      return NextResponse.json({
        success: true,
        data: fallbackList,
        is_fallback: true,
      });
    }

    const formatted = (deptData || []).map((d: any) => ({
      ...d,
      user_count: userCountMap[d.name] || 0,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      is_fallback: false,
    });
  } catch (error: any) {
    console.error('[/api/admin/departments GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['super_admin']);
    if (!session) return forbidden('Hanya Super Admin yang dapat menambahkan divisi baru.');

    const body = await request.json();
    const { name, code, description } = body;

    const cleanName = (name || '').trim();
    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Nama divisi wajib diisi (minimal 2 karakter).' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Cek duplikasi nama divisi (case-insensitive)
    const { data: existing, error: checkErr } = await supabase
      .from('departments')
      .select('id, name')
      .ilike('name', cleanName)
      .maybeSingle();

    if (checkErr && checkErr.code === 'PGRST205') {
      return NextResponse.json(
        {
          success: false,
          error: 'Tabel departments belum dibuat di Supabase. Mohon jalankan skrip supabase/migration_v4_departments.sql di SQL Editor terlebih dahulu.',
        },
        { status: 400 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Divisi "${existing.name}" sudah terdaftar.` },
        { status: 409 }
      );
    }

    const { data: created, error: insertErr } = await supabase
      .from('departments')
      .insert({
        name: cleanName,
        code: (code || '').trim() || null,
        description: (description || '').trim() || null,
      })
      .select()
      .single();

    if (insertErr) {
      throw insertErr;
    }

    return NextResponse.json({
      success: true,
      data: created,
      message: `Divisi "${cleanName}" berhasil ditambahkan.`,
    });
  } catch (error: any) {
    console.error('[/api/admin/departments POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole(['super_admin']);
    if (!session) return forbidden('Hanya Super Admin yang dapat mengubah data divisi.');

    const body = await request.json();
    const { id, name, code, description } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID divisi diperlukan.' }, { status: 400 });
    }

    const cleanName = (name || '').trim();
    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Nama divisi tidak boleh kosong (minimal 2 karakter).' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Ambil data divisi saat ini
    const { data: currentDept, error: fetchErr } = await supabase
      .from('departments')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchErr || !currentDept) {
      return NextResponse.json({ success: false, error: 'Divisi tidak ditemukan.' }, { status: 404 });
    }

    // Cek jika nama baru sudah dipakai oleh record lain
    const { data: duplicate } = await supabase
      .from('departments')
      .select('id, name')
      .ilike('name', cleanName)
      .neq('id', id)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        { success: false, error: `Nama divisi "${duplicate.name}" sudah digunakan oleh divisi lain.` },
        { status: 409 }
      );
    }

    // Update divisi
    const { data: updated, error: updateErr } = await supabase
      .from('departments')
      .update({
        name: cleanName,
        code: (code || '').trim() || null,
        description: (description || '').trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Jika nama berubah, sinkronkan nama divisi di tabel users
    if (currentDept.name !== cleanName) {
      await supabase
        .from('users')
        .update({ department: cleanName })
        .eq('department', currentDept.name);
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Divisi "${cleanName}" berhasil diperbarui.`,
    });
  } catch (error: any) {
    console.error('[/api/admin/departments PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRole(['super_admin']);
    if (!session) return forbidden('Hanya Super Admin yang dapat menghapus divisi.');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID divisi diperlukan.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Ambil data divisi
    const { data: dept, error: fetchErr } = await supabase
      .from('departments')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchErr || !dept) {
      return NextResponse.json({ success: false, error: 'Divisi tidak ditemukan.' }, { status: 404 });
    }

    // Cek apakah masih ada pengguna yang terdaftar di divisi ini
    const { count: userCount, error: countErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('department', dept.name);

    if (countErr) throw countErr;

    if (userCount && userCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Tidak dapat menghapus divisi "${dept.name}" karena masih ada ${userCount} pengguna yang terdaftar di divisi ini. Silakan pindahkan divisi pengguna tersebut terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    const { error: deleteErr } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({
      success: true,
      message: `Divisi "${dept.name}" berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('[/api/admin/departments DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
