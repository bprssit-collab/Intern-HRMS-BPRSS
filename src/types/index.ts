/**
 * TypeScript type definitions for PT BPR Sehat Sejahtera HRMS
 */

// ============================================================
// DATABASE ENTITY TYPES
// ============================================================

export type UserRole = 'intern' | 'intern_hrd' | 'staf_hrd' | 'kepala_hrd' | 'super_admin';
export type InternStatus = 'active' | 'perbantuan' | 'completed';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: UserRole;
  department?: string;        // e.g. CS, Teller UNPAM, SDM, Accounting, Kepatuhan, Kredit, Audit, Social Media
  batch_id?: string;          // FK -> batches.id
  status?: InternStatus;      // 'active' | 'perbantuan' | 'completed'
  must_change_credentials?: boolean;
  face_descriptor?: number[] | null; // 128-float array from face-api.js
  created_at: string;
}

export interface Batch {
  id: string;
  batch_number: number;        // e.g. 15
  name: string;                // e.g. "Batch 15"
  start_date: string;          // ISO date: YYYY-MM-DD
  end_date: string;            // ISO date: YYYY-MM-DD (typically 6 months)
  is_active: boolean;
  full_day_rate: number;       // IDR normal full day rate (e.g. 50000)
  half_day_rate: number;       // IDR normal half day rate (e.g. 25000)
  perbantuan_full_day_rate: number; // IDR perbantuan full day rate (e.g. 75000)
  perbantuan_half_day_rate: number; // IDR perbantuan half day rate (e.g. 37500)
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  user_count?: number;
  created_at?: string;
}

export interface Settings {
  id: string;
  office_lat: number;
  office_long: number;
  max_radius_meters: number;
  full_day_rate: number;   // IDR - HRD-only context
  half_day_rate: number;   // IDR - HRD-only context
  perbantuan_full_day_rate?: number;
  perbantuan_half_day_rate?: number;
  updated_at: string;
}

export type AttendanceStatus = 'full_day' | 'half_day' | 'pending';
export type AttendanceCode = 'H' | '1/2' | 'I' | 'S' | 'A';

export interface Attendance {
  id: string;
  user_id: string;
  date: string;                        // ISO date string: YYYY-MM-DD
  check_in_time: string | null;        // ISO datetime string
  check_out_time: string | null;       // ISO datetime string
  check_in_lat: number | null;
  check_in_long: number | null;
  distance_from_office: number | null; // meters
  status: AttendanceStatus | null;
  attendance_status?: AttendanceCode | null; // 'H', '1/2', 'I', 'S', 'A'
  is_perbantuan?: boolean;             // True if attended during perbantuan period
  notes?: string | null;               // Detailed notes/reasons (e.g. "Masuk kuliah & rapat prodi")
  edit_count?: number;                 // How many times HRD manually edited the attendance code
  last_edited_by?: string | null;      // users.id of the last editor
  last_edited_at?: string | null;      // ISO datetime of the last manual edit
  created_at: string;
}

// ============================================================
// SESSION / AUTH TYPES
// ============================================================

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: UserRole;
  department?: string;
  batch_id?: string;
  must_change_credentials?: boolean;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================
// HRD PAYOUT TYPES (Financial data - HRD module only)
// ============================================================

/** 
 * Payout summary per intern for a given date range.
 * CRITICAL: This type must ONLY be used in HRD module components/pages.
 */
export interface PayoutSummary {
  user_id: string;
  intern_name: string;
  department?: string;
  is_perbantuan?: boolean;
  full_day_count: number;
  half_day_count: number;
  perbantuan_full_count?: number;
  perbantuan_half_count?: number;
  normal_amount?: number;
  perbantuan_amount?: number;
  full_day_rate: number;       // IDR per day
  half_day_rate: number;       // IDR per day
  perbantuan_full_rate?: number;
  perbantuan_half_rate?: number;
  total_amount: number;        // total IDR
}

// ============================================================
// ATTENDANCE MATRIX RECAP TYPES (Spreadsheet format)
// ============================================================

export interface MatrixCell {
  date: string;
  code: AttendanceCode | null;
  is_weekend: boolean;
  is_perbantuan?: boolean;
  notes?: string | null;
  record_id?: string;
  attended?: boolean;   // intern physically checked in (or has H / 1/2 code)
  edit_count?: number;  // number of manual edits already applied
}

export interface MatrixRow {
  user_id: string;
  name: string;
  department: string;
  status: InternStatus;
  cells: Record<string, MatrixCell>; // indexed by 'YYYY-MM-DD'
  summary: {
    H: number;
    S: number;
    I: number;
    A: number;
    Full: number;
    Half: number;
  };
  notesList: string[]; // aggregated notes from days
}

export interface MatrixDepartmentGroup {
  department: string;
  rows: MatrixRow[];
}

export interface AttendanceRecapData {
  batch: Batch;
  startDate: string;
  endDate: string;
  dateList: { date: string; dayName: string; is_weekend: boolean; weekLabel: string }[];
  weeks: { label: string; dateCount: number }[];
  departments: MatrixDepartmentGroup[];
  currentRole?: UserRole;
}

// ============================================================
// GEOFENCE / LOCATION TYPES
// ============================================================

export interface GeoPosition {
  lat: number;
  long: number;
}

export interface GeofenceResult {
  isValid: boolean;
  distance: number; // meters
  message: string;
}

// ============================================================
// FACE RECOGNITION TYPES
// ============================================================

export interface FaceMatchResult {
  matched: boolean;
  distance: number; // Euclidean distance (< 0.65 = match)
  similarityScore?: number; // 0 - 100 percentage
  message: string;
}
