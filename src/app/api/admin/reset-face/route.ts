import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';

/**
 * POST /api/admin/reset-face
 * Super Admin only: Resets an intern's face descriptor to null,
 * allowing them to register a new face.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('super_admin');
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Fitur ini hanya dapat dilakukan oleh Super Admin.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'Parameter user_id diperlukan.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check user exists
    const { data: targetUser, error: findError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', user_id)
      .single();

    if (findError || !targetUser) {
      return NextResponse.json(
        { success: false, error: 'Data pengguna tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Reset face descriptor
    const { error: updateError } = await supabase
      .from('users')
      .update({ face_descriptor: null })
      .eq('id', user_id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Gagal mereset data wajah.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Data wajah untuk ${targetUser.name} (${targetUser.email}) berhasil di-reset. Anak magang dapat mendaftarkan wajah ulang.`,
    });
  } catch (error: any) {
    console.error('[/api/admin/reset-face] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
