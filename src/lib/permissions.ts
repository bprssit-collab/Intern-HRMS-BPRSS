/**
 * Role-based permission rules (single source of truth).
 * Pure functions only - safe to import from both server and client code.
 *
 * Roles:
 *  - intern       : registers face & check-in/out only
 *  - intern_hrd   : intern placed in HR (SDM). Can check-in/out AND use a limited HRD portal
 *  - staf_hrd     : HRD staff
 *  - kepala_hrd   : HRD head
 *  - super_admin  : full access
 */

import type { UserRole, AttendanceCode } from '@/types';

export const ALL_ROLES: UserRole[] = ['intern', 'intern_hrd', 'staf_hrd', 'kepala_hrd', 'super_admin'];

export const ROLE_LABELS: Record<UserRole, string> = {
  intern: 'Intern',
  intern_hrd: 'Intern HRD',
  staf_hrd: 'Staf HRD',
  kepala_hrd: 'Kepala HRD',
  super_admin: 'Super Admin',
};

/** Roles that can open the intern portal (face registration + check-in/out). */
export const INTERN_PORTAL_ROLES: UserRole[] = ['intern', 'intern_hrd'];

/** Roles that can open the HRD portal (/hrd/*). */
export const HRD_PORTAL_ROLES: UserRole[] = ['intern_hrd', 'staf_hrd', 'kepala_hrd', 'super_admin'];

/** HRD roles that can manage batches, payout, settings and see the daily history (not intern_hrd). */
export const MANAGER_ROLES: UserRole[] = ['staf_hrd', 'kepala_hrd', 'super_admin'];

/** Roles whose accounts are interns that attend (appear in recap, payout, intern list). */
export const ATTENDEE_ROLES: UserRole[] = ['intern', 'intern_hrd'];

export function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && (ALL_ROLES as string[]).includes(role);
}

export function isHrdPortalRole(role: UserRole): boolean {
  return HRD_PORTAL_ROLES.includes(role);
}

export function isInternPortalRole(role: UserRole): boolean {
  return INTERN_PORTAL_ROLES.includes(role);
}

export function isManagerRole(role: UserRole): boolean {
  return MANAGER_ROLES.includes(role);
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'super_admin';
}

/** Where a user lands after login / when redirected away from a forbidden page. */
export function defaultHomeForRole(role: UserRole): string {
  return isHrdPortalRole(role) ? '/hrd/dashboard' : '/intern/dashboard';
}

// ============================================================
// ATTENDANCE CODE EDIT RULES (Rekap Absensi)
// ============================================================

export interface AttendanceEditPolicy {
  allowed: boolean;
  allowedCodes: AttendanceCode[];
  requireNotes: boolean;
  /** Human readable explanation (shown when locked, or as a warning when limited to one edit). */
  message: string;
  /** True when the role may only edit once (so the UI can warn before saving). */
  oneTimeOnly: boolean;
}

export interface AttendanceEditTarget {
  /** Intern physically checked in (or the record already carries H / 1/2). */
  attended: boolean;
  /** How many times the code has been manually edited already. */
  editCount: number;
}

/**
 * Decides whether `role` may edit an attendance cell, and which codes it may pick.
 *
 *  - Attended (H / 1/2):
 *      intern_hrd  -> locked
 *      staf/kepala -> H or 1/2, exactly once
 *      super_admin -> any code, unlimited
 *  - Not attended (empty):
 *      codes limited to S / I / A, notes (keterangan) required
 *      intern_hrd / staf / kepala -> once
 *      super_admin -> unlimited
 */
export function getAttendanceEditPolicy(
  role: UserRole | undefined | null,
  target: AttendanceEditTarget
): AttendanceEditPolicy {
  const locked = (message: string): AttendanceEditPolicy => ({
    allowed: false,
    allowedCodes: [],
    requireNotes: false,
    message,
    oneTimeOnly: false,
  });

  if (!role || !isHrdPortalRole(role)) {
    return locked('Anda tidak memiliki izin untuk mengubah kode kehadiran.');
  }

  const isSuper = role === 'super_admin';

  if (target.attended) {
    if (role === 'intern_hrd') {
      return locked('Kode kehadiran H / 1/2 hanya dapat diubah oleh Staf HRD atau Kepala HRD.');
    }
    if (!isSuper && target.editCount >= 1) {
      return locked('Kode kehadiran ini sudah pernah diubah 1x. Hanya Super Admin yang dapat mengubahnya lagi.');
    }
    return {
      allowed: true,
      allowedCodes: isSuper ? ['H', '1/2', 'I', 'S', 'A'] : ['H', '1/2'],
      requireNotes: false,
      oneTimeOnly: !isSuper,
      message: isSuper
        ? 'Super Admin dapat mengubah kode kehadiran berulang kali.'
        : 'Perhatian: kode kehadiran ini hanya dapat diubah 1x. Setelah disimpan akan terkunci.',
    };
  }

  // Intern did not attend
  if (!isSuper && target.editCount >= 1) {
    return locked('Status ketidakhadiran ini sudah pernah diubah 1x. Hanya Super Admin yang dapat mengubahnya lagi.');
  }
  return {
    allowed: true,
    allowedCodes: ['S', 'I', 'A'],
    requireNotes: true,
    oneTimeOnly: !isSuper,
    message: isSuper
      ? 'Intern tidak absen. Pilih S / I / A dan isi keterangan.'
      : 'Intern tidak absen. Pilih S / I / A dan isi keterangan. Perubahan hanya dapat dilakukan 1x.',
  };
}
