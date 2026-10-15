/**
 * Server-side page guard.
 * Use inside a server `layout.tsx` of a protected route segment so that a role
 * which is not allowed gets redirected (menu hiding alone is not security).
 */

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { defaultHomeForRole } from '@/lib/permissions';
import type { UserRole } from '@/types';

export async function requirePageRole(allowed: UserRole[]) {
  const session = await getSession();
  if (!session) redirect('/');
  if (!allowed.includes(session.role)) redirect(defaultHomeForRole(session.role));
  return session;
}
