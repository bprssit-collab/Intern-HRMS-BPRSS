-- ============================================================
-- PT BPR Sehat Sejahtera - Intern HRMS Migration V2
-- 5 Roles, Batch Rates Update, Audit Columns & Accounts
-- Run this script in your Supabase SQL Editor
-- ============================================================

-- 1. DROP OLD CONSTRAINT FIRST SO WE CAN CLEAN UP LEGACY ROLES
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. REMOVE LEGACY 'hrd' ACCOUNTS & RELATED ATTENDANCE
DELETE FROM attendance WHERE user_id IN (SELECT id FROM users WHERE role = 'hrd' OR email = 'hrd@bprsehat.com');
DELETE FROM users WHERE role = 'hrd' OR email = 'hrd@bprsehat.com';

-- Update any stray/invalid roles to 'intern' before applying new check constraint
UPDATE users
SET role = 'intern'
WHERE role NOT IN ('intern', 'intern_hrd', 'staf_hrd', 'kepala_hrd', 'super_admin');

-- 3. APPLY NEW 5-ROLES CHECK CONSTRAINT
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('intern', 'intern_hrd', 'staf_hrd', 'kepala_hrd', 'super_admin'));

-- 4. ADD AUDIT COLUMNS TO attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS edit_count INT NOT NULL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

-- 5. UPDATE BATCH 15 DATES & RATES
-- Batch 15 period: 01 September 2026 s/d 15 Januari 2027
-- Normal: Full=20k, Half=10k | Perbantuan: Full=50k, Half=25k
UPDATE batches
SET
  start_date = '2026-09-01',
  end_date = '2027-01-15',
  full_day_rate = 20000,
  half_day_rate = 10000,
  perbantuan_full_day_rate = 50000,
  perbantuan_half_day_rate = 25000
WHERE batch_number = 15;

-- Update column defaults for future batches
ALTER TABLE batches ALTER COLUMN full_day_rate SET DEFAULT 20000;
ALTER TABLE batches ALTER COLUMN half_day_rate SET DEFAULT 10000;
ALTER TABLE batches ALTER COLUMN perbantuan_full_day_rate SET DEFAULT 50000;
ALTER TABLE batches ALTER COLUMN perbantuan_half_day_rate SET DEFAULT 25000;

-- 6. INSERT / UPDATE HRD HEAD & STAFF ACCOUNTS
-- Password kepala123: kepala.hrd@bprsehat.com
-- Password staf123: staf.hrd@bprsehat.com
INSERT INTO users (id, name, email, password_hash, role, department, batch_id, status)
VALUES
  (
    '11111111-1111-1111-1111-111111111110',
    'Kepala HRD',
    'kepala.hrd@bprsehat.com',
    '$2b$10$3c12i5y3e6P615p5s5fWge7R8Nl52gM840fWc0LhJzFjJqCfe92p2',
    'kepala_hrd',
    'HRD & Personalia',
    NULL,
    'active'
  ),
  (
    '11111111-1111-1111-1111-111111111112',
    'Staf HRD',
    'staf.hrd@bprsehat.com',
    '$2b$10$09J4yW7/6jD4x6R.2Z37tOUK3fR2kC8kX7Z1A9e1P6qYjE6v0n8n6',
    'staf_hrd',
    'HRD & Personalia',
    NULL,
    'active'
  )
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  status = EXCLUDED.status;

-- Update Alfiani to intern_hrd if placed in SDM
UPDATE users
SET role = 'intern_hrd', department = 'SDM'
WHERE email = 'alfiani@intern.bprsehat.com';

-- 7. REFRESH SETTINGS DEFAULT RATES
UPDATE settings
SET
  full_day_rate = 20000,
  half_day_rate = 10000,
  perbantuan_full_day_rate = 50000,
  perbantuan_half_day_rate = 25000;
