-- ============================================================
-- PT BPR Sehat Sejahtera - Intern HRMS Migration v6
-- 1. Tabel Hari Libur Nasional & Cuti Bersama (holidays)
-- 2. Kolom Jam Kerja / Periode Absen pada tabel settings
-- 3. Kolom Tarif Uang Saku Lembur (overtime_rate = Rp 50.000) pada tabel batches
-- 4. Kolom Status Lembur (is_overtime, overtime_approved) & Kode 'HL' pada tabel attendance
-- ============================================================

-- 1. Buat tabel holidays (Hari Libur Nasional & Cuti Bersama)
CREATE TABLE IF NOT EXISTS holidays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'national'
                CHECK (type IN ('national', 'cuti_bersama', 'company')),
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'holidays' AND policyname = 'holidays_no_direct_access'
  ) THEN
    CREATE POLICY "holidays_no_direct_access" ON holidays FOR ALL USING (false);
  END IF;
END $$;

-- Seed daftar Hari Libur Nasional & Cuti Bersama Tahun 2026 (SKB 3 Menteri)
INSERT INTO holidays (date, name, type)
VALUES
  ('2026-01-01', 'Tahun Baru 2026 Masehi', 'national'),
  ('2026-01-16', 'Isra Mikraj Nabi Muhammad SAW', 'national'),
  ('2026-02-16', 'Cuti Bersama Tahun Baru Imlek 2577 Kongzili', 'cuti_bersama'),
  ('2026-02-17', 'Tahun Baru Imlek 2577 Kongzili', 'national'),
  ('2026-03-18', 'Cuti Bersama Hari Suci Nyepi Tahun Baru Saka 1948', 'cuti_bersama'),
  ('2026-03-19', 'Hari Suci Nyepi Tahun Baru Saka 1948', 'national'),
  ('2026-03-20', 'Cuti Bersama Hari Raya Idul Fitri 1447 H', 'cuti_bersama'),
  ('2026-03-21', 'Hari Raya Idul Fitri 1447 H (Hari Pertama)', 'national'),
  ('2026-03-22', 'Hari Raya Idul Fitri 1447 H (Hari Kedua)', 'national'),
  ('2026-03-23', 'Cuti Bersama Hari Raya Idul Fitri 1447 H', 'cuti_bersama'),
  ('2026-03-24', 'Cuti Bersama Hari Raya Idul Fitri 1447 H', 'cuti_bersama'),
  ('2026-04-03', 'Wafat Yesus Kristus (Jumat Agung)', 'national'),
  ('2026-04-05', 'Kebangkitan Yesus Kristus (Paskah)', 'national'),
  ('2026-05-01', 'Hari Buruh Internasional', 'national'),
  ('2026-05-14', 'Kenaikan Yesus Kristus', 'national'),
  ('2026-05-15', 'Cuti Bersama Kenaikan Yesus Kristus', 'cuti_bersama'),
  ('2026-05-27', 'Hari Raya Idul Adha 1447 H', 'national'),
  ('2026-05-28', 'Cuti Bersama Hari Raya Idul Adha 1447 H', 'cuti_bersama'),
  ('2026-05-31', 'Hari Raya Waisak 2570 BE', 'national'),
  ('2026-06-01', 'Hari Lahir Pancasila', 'national'),
  ('2026-06-16', 'Tahun Baru Islam 1448 Hijriah', 'national'),
  ('2026-08-17', 'Hari Kemerdekaan Republik Indonesia ke-81', 'national'),
  ('2026-08-25', 'Maulid Nabi Muhammad SAW', 'national'),
  ('2026-12-24', 'Cuti Bersama Hari Raya Natal', 'cuti_bersama'),
  ('2026-12-25', 'Hari Raya Natal', 'national')
ON CONFLICT (date) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type;

-- 2. Tambahkan kolom konfigurasi Jam Absen pada tabel settings
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS work_start_time VARCHAR(5) NOT NULL DEFAULT '08:30',
  ADD COLUMN IF NOT EXISTS full_day_max_in VARCHAR(5) NOT NULL DEFAULT '10:30',
  ADD COLUMN IF NOT EXISTS work_end_time   VARCHAR(5) NOT NULL DEFAULT '16:00';

-- 3. Tambahkan kolom tarif lembur (Sabtu/Hari Libur) pada tabel batches (Default Rp 50.000)
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS overtime_rate INTEGER NOT NULL DEFAULT 50000;

-- 4. Tambahkan kolom lembur (is_overtime, overtime_approved) & perluas constraint attendance_status ('HL') pada tabel attendance
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS overtime_approved BOOLEAN NOT NULL DEFAULT false;

-- Perbarui constraint attendance_status agar mendukung kode 'HL' (Hadir Lembur)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'attendance'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%attendance_status%'
  ) LOOP
    EXECUTE 'ALTER TABLE attendance DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE attendance
  ADD CONSTRAINT attendance_attendance_status_check
  CHECK (attendance_status IN ('H', '1/2', 'I', 'S', 'A', 'HL'));

