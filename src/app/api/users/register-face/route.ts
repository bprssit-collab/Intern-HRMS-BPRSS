/**
 * POST /api/users/register-face
 * Saves or updates the face descriptor for the authenticated intern.
 * face_descriptor: 128-float array captured by face-api.js on the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('intern');
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { face_descriptor } = body;

    // Validate descriptor: must be an array of exactly 128 numbers
    if (
      !Array.isArray(face_descriptor) ||
      face_descriptor.length !== 128 ||
      !face_descriptor.every((v) => typeof v === 'number' && isFinite(v))
    ) {
      return NextResponse.json(
        { success: false, error: 'Data wajah tidak valid. Pastikan wajah terdeteksi dengan jelas.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('users')
      .update({ face_descriptor })
      .eq('id', session.id);

    if (error) throw error;

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

