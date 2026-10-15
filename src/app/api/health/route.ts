/**
 * GET /api/health
 * Public health check route to verify whether the deployment
 * is actively connected to Supabase Cloud or falling back to local-db.
 */

import { NextResponse } from 'next/server';
import { createAdminClient, isUsingLocalDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  
  // Mask the URL for safety (e.g., https://abcdefghij.supabase.co -> https://abc***.supabase.co)
  const maskedUrl = supabaseUrl && !supabaseUrl.includes('YOUR_PROJECT_ID')
    ? supabaseUrl.replace(/^(https:\/\/[a-z0-9]{3})[a-z0-9]+(\.supabase\.co.*)$/i, '$1***$2')
    : supabaseUrl || '(belum diisi)';

  if (isUsingLocalDb) {
    return NextResponse.json({
      status: 'using_local_json',
      connected_to_supabase: false,
      database: 'Local File JSON (data/db.json)',
      supabase_url: maskedUrl,
      warning: 'Aplikasi saat ini berjalan menggunakan file lokal data/db.json. Di Vercel, penyimpanan data wajah/absen akan hilang karena serverless read-only.',
      solusi: 'Tambahkan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY di Vercel Settings -> Environment Variables, lalu Redeploy.',
    }, { status: 200 });
  }

  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({
        status: 'supabase_error',
        connected_to_supabase: false,
        database: 'Supabase Cloud',
        supabase_url: maskedUrl,
        error: error.message,
        petunjuk: 'Kredensial ada tetapi query database gagal. Pastikan skrip supabase/schema.sql sudah dijalankan di SQL Editor Supabase.',
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'connected_to_supabase',
      connected_to_supabase: true,
      database: 'Supabase Cloud (PostgreSQL)',
      supabase_url: maskedUrl,
      users_count: count ?? 0,
      message: '✅ Berhasil terhubung ke Supabase Cloud! Data wajah dan absensi akan tersimpan permanen di cloud.',
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({
      status: 'connection_exception',
      connected_to_supabase: false,
      error: err.message || 'Terjadi kesalahan saat menghubungi Supabase',
    }, { status: 500 });
  }
}
