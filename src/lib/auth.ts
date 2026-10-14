/**
 * Authentication helpers
 * Uses HTTP-only cookie-based sessions with simple JWT-like tokens.
 * Passwords hashed with bcryptjs on the server.
 */

import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase';
import type { SessionUser } from '@/types';

export const SESSION_COOKIE = 'hrms_session';
const SESSION_DURATION_HOURS = 8; // 8-hour work day session

/**
 * Creates a simple base64-encoded session token.
 * For production, replace with proper JWT signing.
 */
export function createSessionToken(user: SessionUser): string {
  const payload = {
    ...user,
    exp: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Decodes and validates a session token.
 * Returns null if the token is invalid or expired.
 */
export function decodeSessionToken(token: string): SessionUser | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    
    // Check expiry
    if (payload.exp < Date.now()) {
      return null;
    }

    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/**
 * Gets the current session from the request cookies.
 * Returns null if not logged in or session expired.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  
  if (!token) return null;
  
  return decodeSessionToken(token);
}

/**
 * Sets the session cookie on the response.
 * Used in login API route after successful authentication.
 */
export function getSessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    // Set to false so cookies work when accessing via local IP over HTTP (e.g. http://10.9.0.71:3000)
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax' as const,
    maxAge: SESSION_DURATION_HOURS * 60 * 60,
    path: '/',
  };
}

/**
 * Validates that the current session belongs to the required role.
 * Super Admin automatically inherits all HRD permissions.
 */
export async function requireRole(
  requiredRole: import('@/types').UserRole | import('@/types').UserRole[]
): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;

  const allowed = Array.isArray(requiredRole) ? [...requiredRole] : [requiredRole];
  // super_admin automatically satisfies 'hrd' requirements
  if (allowed.includes('hrd') && !allowed.includes('super_admin')) {
    allowed.push('super_admin');
  }

  if (!allowed.includes(session.role)) {
    return null;
  }
  return session;
}

/**
 * Fetches the full user record from the database using the session.
 * Used when we need the face_descriptor or other DB-only fields.
 */
export async function getUserFromSession(session: SessionUser) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.id)
    .single();

  if (error || !data) return null;
  return data;
}
