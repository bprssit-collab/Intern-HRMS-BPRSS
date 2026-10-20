-- ============================================================
-- PT BPR Sehat Sejahtera - Intern HRMS Migration v4
-- Dynamic Departments Management (Manajemen Divisi / Bagian)
-- ============================================================

-- 1. Buat tabel departments
CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  code        TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan RLS dan buat security policy (Hanya service_role / backend API yang dapat akses langsung)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_no_direct_access" ON departments FOR ALL USING (false);

-- 3. Index untuk pencarian cepat nama divisi (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(LOWER(name));

-- 4. Seed data awal divisi perusahaan (jika belum ada)
INSERT INTO departments (name, description)
VALUES 
  ('CS', 'Customer Service & Pelayanan Nasabah'),
  ('Teller UNPAM', 'Kasir dan Layanan Teller Kantor Kas UNPAM'),
  ('SDM', 'Sumber Daya Manusia & HRD'),
  ('Accounting', 'Akuntansi, Pembukuan & Keuangan'),
  ('Kepatuhan', 'Kepatuhan Regulasi & Manajemen Risiko'),
  ('Kredit', 'Analisis dan Administrasi Pembiayaan / Kredit'),
  ('Audit', 'Internal Audit, Kontrol & Pengawasan'),
  ('Social Media', 'Pemasaran Digital, Desain Kreatif & Media Sosial'),
  ('Operasional', 'Operasional Kantor & Layanan Kas'),
  ('IT', 'Teknologi Informasi, Pemrograman & Jaringan'),
  ('Umum', 'Fasilitas, Logistik & Bagian Umum')
ON CONFLICT (name) DO NOTHING;
