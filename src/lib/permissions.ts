/**
 * Role-based permission rules (single source of truth).
 * Pure functions only - safe to import from both server and client code.
 *
 * Roles:
 *  - intern       : registers face & check-in/out only
 *  - intern_hrd   : intern placed in HR (SDM). Can check-in/out AND use a limited HRD portal
 *  - staf_hrd     : HRD staff (all 6 attendance codes, max 3x edits per cell)
 *  - kepala_hrd   : HRD head (all 6 attendance codes, max 5x edits per cell)
 *  - super_admin  : full access (all 6 attendance codes, unlimited edits + delete/reset)
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

/** HRD roles that can manage batches, payout, holidays, summary and see the daily history (not intern_hrd). */
export const MANAGER_ROLES: UserRole[] = ['staf_hrd', 'kepala_hrd', 'super_admin'];

/** Roles whose accounts are interns that attend (appear in recap, payout, intern list). */
export const ATTENDEE_ROLES: UserRole[] = ['intern', 'intern_hrd'];

/** All 6 attendance codes available to Manager & Super Admin roles. */
export const ALL_ATTENDANCE_CODES: AttendanceCode[] = ['H', '1/2', 'HL', 'I', 'S', 'A'];

/** Absence-only codes available to intern_hrd on empty cells. */
export const ABSENCE_CODES: AttendanceCode[] = ['I', 'S', 'A'];

/** Maximum manual edits per cell by role (null = unlimited). */
export const ROLE_MAX_EDITS: Record<UserRole, number | null> = {
  intern: 0,
  intern_hrd: 1,
  staf_hrd: 3,
  kepala_hrd: 5,
  super_admin: null,
};

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

/** Whether detailed notes (keterangan) are mandatory for a chosen attendance code. */
export function isNotesRequiredForCode(code: AttendanceCode | null | undefined): boolean {
  return code === 'I' || code === 'S' || code === 'A';
}

// ============================================================
// ATTENDANCE CODE EDIT RULES (Rekap Absensi)
// ============================================================

export interface AttendanceEditPolicy {
  allowed: boolean;
  allowedCodes: AttendanceCode[];
  /** Default notes requirement (for intern_hrd always true; for managers depends on selected code I/S/A). */
  requireNotes: boolean;
  /** Human readable explanation (shown when locked, or as info banner when editing). */
  message: string;
  /** True when this is the user's final remaining edit (so UI can confirm before locking). */
  oneTimeOnly: boolean;
  /** True when the role has a finite edit quota (intern_hrd: 1, staf_hrd: 3, kepala_hrd: 5). */
  hasEditLimit: boolean;
  /** Maximum edits allowed for this role (null = unlimited). */
  maxEdits: number | null;
  /** Remaining edits available for this role on this cell (null = unlimited). */
  remainingEdits: number | null;
}

export interface AttendanceEditTarget {
  /** Intern physically checked in (or the record already carries H / 1/2 / HL). */
  attended: boolean;
  /** How many times the code has been manually edited already. */
  editCount: number;
}

/**
 * Decides whether `role` may edit an attendance cell, which codes it may pick,
 * and how many edits remain.
 *
 *  - super_admin : all 6 codes (H, 1/2, HL, I, S, A) on any cell, unlimited edits
 *  - kepala_hrd  : all 6 codes (H, 1/2, HL, I, S, A) on any cell, max 5x edits
 *  - staf_hrd    : all 6 codes (H, 1/2, HL, I, S, A) on any cell, max 3x edits
 *  - intern_hrd  : only I, S, A on empty/unattended cells, max 1x edit (locked if attended)
 */
export function getAttendanceEditPolicy(
  role: UserRole | undefined | null,
  target: AttendanceEditTarget
): AttendanceEditPolicy {
  const locked = (message: string, maxEdits: number | null = 0): AttendanceEditPolicy => ({
    allowed: false,
    allowedCodes: [],
    requireNotes: false,
    message,
    oneTimeOnly: false,
    hasEditLimit: maxEdits !== null,
    maxEdits,
    remainingEdits: 0,
  });

  if (!role || !isHrdPortalRole(role)) {
    return locked('Anda tidak memiliki izin untuk mengubah kode kehadiran.');
  }

  // 1. SUPER ADMIN: Semua 6 kode, tanpa batas edit
  if (role === 'super_admin') {
    return {
      allowed: true,
      allowedCodes: ALL_ATTENDANCE_CODES,
      requireNotes: false,
      oneTimeOnly: false,
      hasEditLimit: false,
      maxEdits: null,
      remainingEdits: null,
      message: 'Super Admin dapat memilih semua kode kehadiran (H, 1/2, HL, I, S, A) dan mengubahnya tanpa batas.',
    };
  }

  // 2. INTERN HRD: Hanya boleh memilih I, S, A pada sel yang belum hadir sebanyak 1x edit
  if (role === 'intern_hrd') {
    if (target.attended) {
      return locked(
        'Sel yang sudah berisi kehadiran (H / 1/2 / HL) hanya dapat diubah oleh Staf HRD, Kepala HRD, atau Super Admin.',
        1
      );
    }
    if (target.editCount >= 1) {
      return locked(
        'Status ketidakhadiran ini sudah pernah diisi 1x (batas maksimal Intern HRD). Hanya Staf HRD, Kepala HRD, atau Super Admin yang dapat mengubahnya lagi.',
        1
      );
    }
    return {
      allowed: true,
      allowedCodes: ABSENCE_CODES,
      requireNotes: true,
      oneTimeOnly: true,
      hasEditLimit: true,
      maxEdits: 1,
      remainingEdits: 1,
      message: 'Intern tidak absen. Pilih I / S / A dan wajib isi keterangan. Perubahan hanya dapat dilakukan 1x oleh Intern HRD.',
    };
  }

  // 3. KEPALA HRD (maks 5x edit) & STAF HRD (maks 3x edit): Semua 6 kode baik sel kosong maupun terisi
  const maxEdits = role === 'kepala_hrd' ? 5 : 3;
  const roleLabel = ROLE_LABELS[role] || role;
  const remaining = Math.max(0, maxEdits - target.editCount);

  if (target.editCount >= maxEdits) {
    const higherRoleText =
      role === 'staf_hrd' ? 'Kepala HRD atau Super Admin' : 'Super Admin';
    return locked(
      `Status absensi ini sudah pernah diubah ${target.editCount}x (batas maksimal ${roleLabel}: ${maxEdits}x). Hanya ${higherRoleText} yang dapat mengubahnya lagi.`,
      maxEdits
    );
  }

  return {
    allowed: true,
    allowedCodes: ALL_ATTENDANCE_CODES,
    requireNotes: false,
    oneTimeOnly: remaining === 1,
    hasEditLimit: true,
    maxEdits,
    remainingEdits: remaining,
    message:
      remaining === 1
        ? `Perhatian: Ini adalah kesempatan edit terakhir (${target.editCount + 1}/${maxEdits}) untuk ${roleLabel} pada sel ini.`
        : `Kuota edit ${roleLabel}: sudah diubah ${target.editCount}/${maxEdits} kali (tersisa ${remaining}x kesempatan ubah).`,
  };
}
