/**
 * GET /api/users/me
 * Returns current authenticated user's profile with face_descriptor for matching.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Tidak terautentikasi.' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Pengguna tidak ditemukan.' },
        { status: 404 }
      );
    }

    const formatted = {
      ...data,
      username: data.username || (data.email ? data.email.split('@')[0] : data.name.toLowerCase().replace(/\s+/g, '.')),
      must_change_credentials: !!data.must_change_credentials,
    };

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('[/api/users/me] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
