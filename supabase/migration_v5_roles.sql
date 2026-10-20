-- ============================================================
-- PT BPR Sehat Sejahtera - Intern HRMS Migration v5
-- Dynamic Roles & Access Control Management (Manajemen Role)
-- ============================================================

-- 1. Buat tabel roles
CREATE TABLE IF NOT EXISTS roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           VARCHAR(50) NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  badge         TEXT NOT NULL,
  color         TEXT NOT NULL,
  description   TEXT,
  portal_access TEXT NOT NULL DEFAULT 'hrd', -- 'hrd', 'intern', 'both'
  is_system     BOOLEAN NOT NULL DEFAULT false, -- true untuk role sistem bawaan
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan RLS dan security policy (akses melalui service_role backend API)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_no_direct_access" ON roles FOR ALL USING (false);

-- 3. Index untuk pencarian cepat role key
CREATE INDEX IF NOT EXISTS idx_roles_key ON roles(LOWER(key));

-- 4. Seed data awal 5 role sistem utama beserta matriks perizinan
INSERT INTO roles (key, label, badge, color, description, portal_access, is_system, permissions)
VALUES
  (
    'super_admin',
    'Super Admin',
    'SUPER ADMIN',
    'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'Administrator tingkat tertinggi dengan kontrol penuh atas seluruh akun, divisi, role, batch, audit sistem, dan bypass batasan edit absensi.',
    'hrd',
    true,
    '{"manage_users": true, "manage_departments": true, "manage_roles": true, "manage_batches": true, "view_attendance_history": true, "edit_attendance": "unlimited", "reset_face": true, "payout_access": true, "payout_approval": true, "must_attend": false}'::jsonb
  ),
  (
    'kepala_hrd',
    'Kepala HRD',
    'KEPALA HRD',
    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'Pimpinan divisi SDM / HRD dengan wewenang persetujuan (approval) rekapitulasi uang saku, monitoring riwayat absensi, dan koreksi izin absensi.',
    'hrd',
    true,
    '{"manage_users": false, "manage_departments": false, "manage_roles": false, "manage_batches": true, "view_attendance_history": true, "edit_attendance": "once", "reset_face": false, "payout_access": true, "payout_approval": true, "must_attend": false}'::jsonb
  ),
  (
    'staf_hrd',
    'Staf HRD',
    'STAF HRD',
    'bg-teal-500/20 text-teal-300 border-teal-500/40',
    'Staf operasional HRD yang mengelola batch, rekapitulasi kehadiran, penginputan izin/sakit anak magang, dan operasional harian.',
    'hrd',
    true,
    '{"manage_users": false, "manage_departments": false, "manage_roles": false, "manage_batches": true, "view_attendance_history": true, "edit_attendance": "once", "reset_face": false, "payout_access": true, "payout_approval": false, "must_attend": false}'::jsonb
  ),
  (
    'intern_hrd',
    'Intern HRD (SDM)',
    'INTERN HRD',
    'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'Anak magang yang ditempatkan khusus di bagian SDM. Memiliki hak akses ganda: wajib absen wajah dan dapat memonitor portal HRD secara terbatas.',
    'both',
    true,
    '{"manage_users": false, "manage_departments": false, "manage_roles": false, "manage_batches": false, "view_attendance_history": false, "edit_attendance": "notes_only", "reset_face": false, "payout_access": false, "payout_approval": false, "must_attend": true}'::jsonb
  ),
  (
    'intern',
    'Intern Biasa',
    'INTERN',
    'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'Peserta magang reguler yang hanya memiliki akses ke portal intern pribadi untuk rekam wajah, absen masuk/pulang, dan histori kehadiran mandiri.',
    'intern',
    true,
    '{"manage_users": false, "manage_departments": false, "manage_roles": false, "manage_batches": false, "view_attendance_history": false, "edit_attendance": "none", "reset_face": false, "payout_access": false, "payout_approval": false, "must_attend": true}'::jsonb
  )
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  badge = EXCLUDED.badge,
  color = EXCLUDED.color,
  description = EXCLUDED.description,
  portal_access = EXCLUDED.portal_access,
  permissions = EXCLUDED.permissions;
