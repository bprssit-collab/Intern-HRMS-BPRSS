/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: 'hrms_session',
    value: '',
    maxAge: 0,
    path: '/',
  });
  return response;
}

/**
 * GET /api/auth/me
 * Returns the current session user info.
 */
export async function GET() {
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Tidak terautentikasi.' },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true, data: session });
}
