-- ============================================================
-- PT BPR Sehat Sejahtera - Intern HRMS Database Schema & Seeds
-- Run this script in your Supabase SQL Editor
-- ============================================================

-- Enable pgcrypto for UUID and password hashing support
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TABLE: batches
-- Tracks internship batches (6 months typically, currently Batch 15).
-- Stores regular rates & perbantuan rates for extended duty.
-- ============================================================
CREATE TABLE IF NOT EXISTS batches (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number              INT NOT NULL UNIQUE,
  name                      TEXT NOT NULL,
  start_date                DATE NOT NULL,
  end_date                  DATE NOT NULL,
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  full_day_rate             INT NOT NULL DEFAULT 50000,
  half_day_rate             INT NOT NULL DEFAULT 25000,
  perbantuan_full_day_rate  INT NOT NULL DEFAULT 75000,
  perbantuan_half_day_rate  INT NOT NULL DEFAULT 37500,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TABLE: users
-- Stores intern and HRD accounts.
-- department: CS, Teller UNPAM, SDM, Accounting, Kepatuhan, etc.
-- status: active, perbantuan (extended duty), completed
-- face_descriptor: 128-float array from face-api.js FaceNet model.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('intern', 'hrd', 'super_admin')),
  department      TEXT,
  batch_id        UUID REFERENCES batches(id) ON DELETE SET NULL,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'perbantuan', 'completed')),
  face_descriptor FLOAT8[], -- 128-dimension face embedding vector
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TABLE: settings
-- Singleton table: only 1 row. Office geo + fallback pocket money rates.
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_lat                FLOAT8 NOT NULL DEFAULT -6.200000,  -- Default office coordinate
  office_long               FLOAT8 NOT NULL DEFAULT 106.816666, -- Default office coordinate
  max_radius_meters         INT NOT NULL DEFAULT 200,
  full_day_rate             INT NOT NULL DEFAULT 50000,  -- IDR, HRD-only
  half_day_rate             INT NOT NULL DEFAULT 25000,  -- IDR, HRD-only
  perbantuan_full_day_rate  INT NOT NULL DEFAULT 75000,  -- IDR, HRD-only
  perbantuan_half_day_rate  INT NOT NULL DEFAULT 37500,  -- IDR, HRD-only
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. TABLE: attendance
-- Each row = 1 working day per intern.
-- status: full_day (>6h), half_day (<=6h), pending
-- attendance_status: 'H', '1/2', 'I', 'S', 'A'
-- is_perbantuan: boolean flag if day was perbantuan
-- notes: detail reason for permission/half-day
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date                  DATE NOT NULL,
  check_in_time         TIMESTAMPTZ,
  check_out_time        TIMESTAMPTZ,
  check_in_lat          FLOAT8,
  check_in_long         FLOAT8,
  distance_from_office  FLOAT8, -- Distance in meters at check-in
  status                TEXT CHECK (status IN ('full_day', 'half_day', 'pending')),
  attendance_status     TEXT CHECK (attendance_status IN ('H', '1/2', 'I', 'S', 'A')),
  is_perbantuan         BOOLEAN DEFAULT false,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- Server-side API uses createAdminClient() with service_role key,
-- bypassing RLS. Direct anon access is strictly blocked.
-- ============================================================
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batches_no_direct_access" ON batches FOR ALL USING (false);
CREATE POLICY "users_no_direct_access" ON users FOR ALL USING (false);
CREATE POLICY "settings_public_read" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_no_direct_write" ON settings FOR ALL USING (false);
CREATE POLICY "attendance_no_direct_access" ON attendance FOR ALL USING (false);

-- ============================================================
-- 6. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_batches_active ON batches(is_active);
CREATE INDEX IF NOT EXISTS idx_users_batch ON users(batch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- ============================================================
-- 7. SEED DATA (PT BPR Sehat Sejahtera)
-- ============================================================

-- Settings
INSERT INTO settings (id, office_lat, office_long, max_radius_meters, full_day_rate, half_day_rate, perbantuan_full_day_rate, perbantuan_half_day_rate)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  -6.200000,
  106.816666,
  200,
  50000,
  25000,
  75000,
  37500
) ON CONFLICT (id) DO NOTHING;

-- Batches: Batch 15 (Active, 6 months) & Batch 14 (Completed)
INSERT INTO batches (id, batch_number, name, start_date, end_date, is_active, full_day_rate, half_day_rate, perbantuan_full_day_rate, perbantuan_half_day_rate)
VALUES
  ('b1500000-0000-0000-0000-000000000015', 15, 'Batch 15', '2026-08-01', '2027-01-31', true, 50000, 25000, 75000, 37500),
  ('b1400000-0000-0000-0000-000000000014', 14, 'Batch 14', '2026-02-01', '2026-07-31', false, 45000, 22500, 65000, 32500)
ON CONFLICT (batch_number) DO UPDATE SET
  name = EXCLUDED.name,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  is_active = EXCLUDED.is_active,
  full_day_rate = EXCLUDED.full_day_rate,
  half_day_rate = EXCLUDED.half_day_rate,
  perbantuan_full_day_rate = EXCLUDED.perbantuan_full_day_rate,
  perbantuan_half_day_rate = EXCLUDED.perbantuan_half_day_rate;

-- Users: Super Admin (admin123), Admin HRD (admin123) & 14 Interns (intern123) from reference spreadsheet
INSERT INTO users (id, name, email, password_hash, role, department, batch_id, status)
VALUES
  ('00000000-0000-0000-0000-000000000099', 'Super Admin', 'superadmin@bprsehat.com', '$2b$10$iyo1ft6DWz2EphSgQ1xmc.vHCb18X8DXc4QhKd0QD7K1bS5tFF4v2', 'super_admin', 'IT & Management', NULL, 'active'),
  ('11111111-1111-1111-1111-111111111111', 'Admin HRD', 'hrd@bprsehat.com', '$2b$10$.gceNqbyuUsaK3laNUpYX.2GVYHS2/hpSxkoSMij9XHsNVVqfV4x.', 'hrd', 'HRD', NULL, 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Budi Santoso', 'budi@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'CS', 'b1500000-0000-0000-0000-000000000015', 'active'),
  ('u0100000-0000-0000-0000-000000000001', 'Alfiani Nutriana Ayu', 'alfiani@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'CS', 'b1500000-0000-0000-0000-000000000015', 'active'),
  ('u0100000-0000-0000-0000-000000000002', 'Elsya Yunita Simangunsong', 'elsya@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'Teller UNPAM', 'b1500000-0000-0000-0000-000000000015', 'active'),
  ('u0100000-0000-0000-0000-000000000003', 'Puan Maharani', 'puan@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'Teller UNPAM', 'b1500000-0000-0000-0000-000000000015', 'active'),
  ('u0100000-0000-0000-0000-000000000004', 'Novita Al Fitri Daeng', 'novita@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'Teller UNPAM', 'b1500000-0000-0000-0000-000000000015', 'active'),
  ('u0100000-0000-0000-0000-000000000005', 'Felisitas Erselin', 'felisitas@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'SDM', 'b1500000-0000-0000-0000-000000000015', 'active'),
  ('u0100000-0000-0000-0000-000000000006', 'Listiyani', 'listiyani@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'Accounting', 'b1500000-0000-0000-0000-000000000015', 'active'),
  ('u0100000-0000-0000-0000-000000000007', 'Mustika Wulan', 'mustika@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'Kepatuhan', 'b1500000-0000-0000-0000-000000000015', 'active'),
  ('u0100000-0000-0000-0000-000000000008', 'Muhammad Rizq Noval', 'rizq@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'Kepatuhan', 'b1500000-0000-0000-0000-000000000015', 'active'),
  ('u0100000-0000-0000-0000-000000000009', 'Eki Ramdani Sopyana', 'eki@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'Kredit', 'b1500000-0000-0000-0000-000000000015', 'active'),
  ('u0100000-0000-0000-0000-000000000010', 'Nesya Chintiya Bella', 'nesya@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'Kredit', 'b1500000-0000-0000-0000-000000000015', 'active'),
  ('u0100000-0000-0000-0000-000000000011', 'Bintang Reira Putri Hanafi', 'bintang@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'Audit', 'b1500000-0000-0000-0000-000000000015', 'perbantuan'),
  ('u0100000-0000-0000-0000-000000000012', 'Rosmita Fathia Hidayat', 'rosmita@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'Social Media', 'b1500000-0000-0000-0000-000000000015', 'active'),
  ('u0100000-0000-0000-0000-000000000013', 'Valdis Sandya Akhjan', 'valdis@intern.bprsehat.com', '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', 'intern', 'Social Media', 'b1500000-0000-0000-0000-000000000015', 'perbantuan')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  batch_id = EXCLUDED.batch_id,
  status = EXCLUDED.status;

-- Sample Attendance for Minggu 5 & 6 (28 September 2026 s/d 11 Oktober 2026)
-- Alfiani Nutriana Ayu (05/10 izin kuliah, 28/09 setengah hari)
INSERT INTO attendance (user_id, date, status, attendance_status, is_perbantuan, notes)
VALUES
  ('u0100000-0000-0000-0000-000000000001', '2026-09-28', 'half_day', '1/2', false, 'Pulang lebih awal untuk bimbingan'),
  ('u0100000-0000-0000-0000-000000000001', '2026-09-29', 'full_day', 'H', false, NULL),
  ('u0100000-0000-0000-0000-000000000001', '2026-09-30', 'full_day', 'H', false, NULL),
  ('u0100000-0000-0000-0000-000000000001', '2026-10-01', 'full_day', 'H', false, NULL),
  ('u0100000-0000-0000-0000-000000000001', '2026-10-02', 'full_day', 'H', false, NULL),
  ('u0100000-0000-0000-0000-000000000001', '2026-10-05', 'pending',  'I', false, '05/10 masuk kuliah dan ada rapat prodi'),
  ('u0100000-0000-0000-0000-000000000001', '2026-10-06', 'full_day', 'H', false, NULL),
  ('u0100000-0000-0000-0000-000000000001', '2026-10-07', 'full_day', 'H', false, NULL),
  ('u0100000-0000-0000-0000-000000000001', '2026-10-08', 'full_day', 'H', false, NULL)
ON CONFLICT (user_id, date) DO NOTHING;

-- Novita Al Fitri Daeng (30/09 sakit, 05/10 izin)
INSERT INTO attendance (user_id, date, status, attendance_status, is_perbantuan, notes)
VALUES
  ('u0100000-0000-0000-0000-000000000004', '2026-09-28', 'full_day', 'H', false, NULL),
  ('u0100000-0000-0000-0000-000000000004', '2026-09-29', 'full_day', 'H', false, NULL),
  ('u0100000-0000-0000-0000-000000000004', '2026-09-30', 'pending',  'S', false, '30/09 surat dokter terlampir'),
  ('u0100000-0000-0000-0000-000000000004', '2026-10-01', 'full_day', 'H', false, NULL),
  ('u0100000-0000-0000-0000-000000000004', '2026-10-02', 'full_day', 'H', false, NULL),
  ('u0100000-0000-0000-0000-000000000004', '2026-10-05', 'pending',  'I', false, '05/10 izin urusan kampus'),
  ('u0100000-0000-0000-0000-000000000004', '2026-10-06', 'full_day', 'H', false, NULL),
  ('u0100000-0000-0000-0000-000000000004', '2026-10-07', 'full_day', 'H', false, NULL),
  ('u0100000-0000-0000-0000-000000000004', '2026-10-08', 'full_day', 'H', false, NULL)
ON CONFLICT (user_id, date) DO NOTHING;

-- Bintang Reira Putri Hanafi (Perbantuan di Audit)
INSERT INTO attendance (user_id, date, status, attendance_status, is_perbantuan, notes)
VALUES
  ('u0100000-0000-0000-0000-000000000011', '2026-09-28', 'full_day', 'H', true, 'Perbantuan closing audit semester'),
  ('u0100000-0000-0000-0000-000000000011', '2026-09-29', 'full_day', 'H', true, 'Perbantuan closing audit semester'),
  ('u0100000-0000-0000-0000-000000000011', '2026-09-30', 'full_day', 'H', true, 'Perbantuan closing audit semester'),
  ('u0100000-0000-0000-0000-000000000011', '2026-10-01', 'full_day', 'H', true, 'Perbantuan closing audit semester'),
  ('u0100000-0000-0000-0000-000000000011', '2026-10-02', 'full_day', 'H', true, 'Perbantuan closing audit semester'),
  ('u0100000-0000-0000-0000-000000000011', '2026-10-05', 'full_day', 'H', true, 'Perbantuan closing audit semester'),
  ('u0100000-0000-0000-0000-000000000011', '2026-10-06', 'full_day', 'H', true, 'Perbantuan closing audit semester'),
  ('u0100000-0000-0000-0000-000000000011', '2026-10-07', 'full_day', 'H', true, 'Perbantuan closing audit semester'),
  ('u0100000-0000-0000-0000-000000000011', '2026-10-08', 'full_day', 'H', true, 'Perbantuan closing audit semester')
ON CONFLICT (user_id, date) DO NOTHING;
