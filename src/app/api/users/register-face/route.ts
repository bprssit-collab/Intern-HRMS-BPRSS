/**
 * POST /api/users/register-face
 * Saves or updates the face descriptor for the authenticated intern.
 * face_descriptor: 128-float array captured by face-api.js on the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { INTERN_PORTAL_ROLES } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi Anda telah berakhir. Silakan login kembali.' },
        { status: 401 }
      );
    }

    if (!INTERN_PORTAL_ROLES.includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Akun Anda tidak memerlukan pendaftaran wajah.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { face_descriptor } = body;

    console.log(`[/api/users/register-face] Saving face descriptor for user: ${session.name} (${session.email}, role: ${session.role})`);

    // Validate descriptor: must be an array of exactly 128 numbers
    if (
      !Array.isArray(face_descriptor) ||
      face_descriptor.length !== 128 ||
      !face_descriptor.every((v) => typeof v === 'number' && isFinite(v))
    ) {
      console.warn('[/api/users/register-face] Invalid descriptor received');
      return NextResponse.json(
        { success: false, error: 'Data wajah tidak valid. Pastikan wajah terdeteksi dengan jelas.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // One-time registration: block overwrite when a face is already stored.
    // A Super Admin must delete the existing data first (/api/admin/reset-face).
    const { data: existingUser } = await supabase
      .from('users')
      .select('face_descriptor')
      .eq('id', session.id)
      .single();

    if (Array.isArray(existingUser?.face_descriptor) && existingUser.face_descriptor.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wajah sudah didaftarkan. Jika ingin mengubah, silakan hubungi admin.',
          already_registered: true,
        },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('users')
      .update({ face_descriptor })
      .eq('id', session.id);

    if (error) {
      console.error('[/api/users/register-face] Supabase update error:', error);
      throw error;
    }

    console.log(`[/api/users/register-face] Face descriptor successfully saved for ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Wajah berhasil didaftarkan. Anda sekarang dapat menggunakan absensi berbasis wajah.',
    });

  } catch (error) {
    console.error('[/api/users/register-face] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}

