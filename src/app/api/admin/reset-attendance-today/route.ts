import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';

/**
 * GET /api/admin/reset-attendance-today
 * Returns today's active attendances with intern details for Super Admin review.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('super_admin');
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Fitur ini khusus Super Admin.' },
        { status: 403 }
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const supabase = createAdminClient();

    const { data: attendances, error } = await supabase
      .from('attendance')
      .select('id, user_id, date, check_in_time, check_out_time, status, attendance_status, created_at')
      .eq('date', todayStr);

    if (error) {
      return NextResponse.json({ success: false, error: 'Gagal mengambil data absensi.' }, { status: 500 });
    }

    // Join with user names
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, department');

    const userMap = new Map<string, any>((users || []).map((u: any) => [u.id, u]));

    const enriched = (attendances || []).map((att: any) => {
      const u: any = userMap.get(att.user_id);
      return {
        ...att,
        user_name: u?.name || 'Intern',
        user_email: u?.email || '-',
        department: u?.department || '-',
      };
    });

    return NextResponse.json({
      success: true,
      today: todayStr,
      data: enriched,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/reset-attendance-today
 * Super Admin only: Deletes an intern's attendance for the specified date (defaults to today).
 * Allows the intern to check in again from scratch.
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
    const { user_id, date } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'Parameter user_id diperlukan.' },
        { status: 400 }
      );
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const supabase = createAdminClient();

    // Check user info
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', user_id)
      .single();

    // Delete attendance record for that date
    const { error: deleteError } = await supabase
      .from('attendance')
      .delete()
      .eq('user_id', user_id)
      .eq('date', targetDate);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: 'Gagal menghapus data absensi.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Absensi tanggal ${targetDate} untuk ${targetUser?.name || 'anak magang'} berhasil dihapus. Intern dapat melakukan absen ulang.`,
    });
  } catch (error: any) {
    console.error('[/api/admin/reset-attendance-today] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
