/**
 * POST /api/auth/login
 * Authenticates a user by email/password, sets session cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase';
import { createSessionToken, getSessionCookieOptions } from '@/lib/auth';
import { isValidRole } from '@/lib/permissions';
import type { SessionUser } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email dan password diperlukan.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, password_hash')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah.' },
        { status: 401 }
      );
    }

    // Verify password with bcrypt
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah.' },
        { status: 401 }
      );
    }

    if (!isValidRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Role akun tidak valid. Hubungi Super Admin.' },
        { status: 403 }
      );
    }

    // Create session
    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = createSessionToken(sessionUser);
    const cookieOptions = getSessionCookieOptions(token);

    const response = NextResponse.json({
      success: true,
      data: sessionUser,
    });

    response.cookies.set(cookieOptions);
    return response;

  } catch (error) {
    console.error('[/api/auth/login] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
