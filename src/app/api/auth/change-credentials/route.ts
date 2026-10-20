import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase';
import { getSession, createSessionToken, getSessionCookieOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi login tidak valid atau telah berakhir. Silakan login kembali.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { new_username, new_password } = body;

    if (!new_username || !new_password) {
      return NextResponse.json(
        { success: false, error: 'Username baru dan password baru wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanUsername = String(new_username).trim().toLowerCase();

    // 1. Validate username format: 3-30 chars, alphanumeric, dots, underscores
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return NextResponse.json(
        { success: false, error: 'Username harus memiliki panjang antara 3 sampai 30 karakter.' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9._]+$/.test(cleanUsername)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username hanya boleh terdiri dari huruf kecil, angka, titik (.), atau garis bawah (_).',
        },
        { status: 400 }
      );
    }

    // 2. Validate password length
    if (new_password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password baru minimal harus 6 karakter.' },
        { status: 400 }
      );
    }

    // 3. Username and password must NOT be identical
    if (cleanUsername === new_password.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username dan password tidak boleh sama demi alasan keamanan akun.',
        },
        { status: 400 }
      );
    }

    // 4. New password cannot be the default password
    if (new_password.toLowerCase() === 'magang2026') {
      return NextResponse.json(
        {
          success: false,
          error: 'Password baru tidak boleh menggunakan password default (magang2026). Silakan buat password baru yang aman.',
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch current user details from DB to compare against existing credentials
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('id, username, password_hash, must_change_credentials')
      .eq('id', session.id)
      .single();

    if (fetchError || !currentUser) {
      return NextResponse.json(
        { success: false, error: 'Data akun tidak ditemukan di sistem.' },
        { status: 404 }
      );
    }

    // 5. Username must be changed (cannot remain the current/default username)
    const currentUsername = (currentUser.username || session.username || '').toLowerCase();
    if (cleanUsername === currentUsername) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username baru tidak boleh sama dengan username saat ini/default. Silakan buat username baru Anda.',
        },
        { status: 400 }
      );
    }

    // 6. Password cannot match current password hash
    if (currentUser.password_hash) {
      const isSamePassword = await bcrypt.compare(new_password, currentUser.password_hash);
      if (isSamePassword) {
        return NextResponse.json(
          {
            success: false,
            error: 'Password baru tidak boleh sama dengan password default/lama Anda.',
          },
          { status: 400 }
        );
      }
    }

    // 7. Check if new_username is already taken by ANY OTHER user
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, username')
      .ilike('username', cleanUsername)
      .neq('id', session.id);

    if (existingUser && existingUser.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username sudah terpakai oleh pengguna lain, silakan gunakan username yang berbeda.',
        },
        { status: 409 }
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(new_password, 10);

    // Update in Supabase
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        username: cleanUsername,
        password_hash: passwordHash,
        must_change_credentials: false,
      })
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) {
      // If PostgreSQL unique constraint fails
      if (updateError.code === '23505') {
        return NextResponse.json(
          {
            success: false,
            error: 'Username sudah terpakai, silakan gunakan username yang berbeda.',
          },
          { status: 409 }
        );
      }
      throw updateError;
    }

    // Re-issue updated session token with must_change_credentials = false
    const updatedSession: SessionUser = {
      ...session,
      username: cleanUsername,
      must_change_credentials: false,
    };

    const token = createSessionToken(updatedSession);
    const cookieOptions = getSessionCookieOptions(token);

    const response = NextResponse.json({
      success: true,
      message: 'Username dan password baru berhasil disimpan. Selamat datang!',
      data: updatedSession,
    });

    response.cookies.set(cookieOptions);
    return response;
  } catch (error: any) {
    console.error('[/api/auth/change-credentials] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server saat menyimpan kredensial.' },
      { status: 500 }
    );
  }
}
