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
    const rawIdentifier = (body.username || body.email || '').trim().toLowerCase();
    const password = body.password;

    // Basic validation
    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Username dan password diperlukan.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    let user: any = null;

    // 1. Try querying by username first
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', rawIdentifier)
        .single();
      if (!error && data) {
        user = data;
      }
    } catch {
      // In case username column is being initialized
    }

    // 2. Fallback to email search or prefix match
    if (!user) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('*')
        .ilike('email', rawIdentifier)
        .single();

      if (userByEmail) {
        user = userByEmail;
      } else {
        // Try matching prefix of email
        const { data: allUsers } = await supabase.from('users').select('*');
        if (allUsers) {
          user = allUsers.find((u: any) => {
            const uName = (u.username || '').toLowerCase();
            const emailPrefix = (u.email || '').split('@')[0].toLowerCase();
            return uName === rawIdentifier || emailPrefix === rawIdentifier;
          });
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Username atau password salah.' },
        { status: 401 }
      );
    }

    // Verify password with bcrypt
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: 'Username atau password salah.' },
        { status: 401 }
      );
    }

    if (!isValidRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Role akun tidak valid. Hubungi Super Admin.' },
        { status: 403 }
      );
    }

    const resolvedUsername =
      user.username ||
      (user.email ? user.email.split('@')[0] : user.name.toLowerCase().replace(/\s+/g, '.'));

    // Create session
    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      username: resolvedUsername,
      email: user.email ?? undefined,
      role: user.role,
      department: user.department ?? undefined,
      batch_id: user.batch_id ?? undefined,
      must_change_credentials: !!user.must_change_credentials,
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
