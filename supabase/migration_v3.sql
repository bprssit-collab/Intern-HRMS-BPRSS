-- ============================================================
-- PT BPR Sehat Sejahtera - Intern HRMS Migration v3
-- 1. Tambah kolom username (UNIQUE) dan must_change_credentials
-- 2. Migrasi akun lama dari email ke username
-- 3. Membuat kolom email menjadi opsional (nullable)
-- ============================================================

-- 1. Tambah kolom username dan must_change_credentials
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_credentials BOOLEAN DEFAULT FALSE;

-- 2. Set username unik untuk seluruh akun demo / akun bawaan yang ada
UPDATE users SET username = 'superadmin' WHERE email = 'superadmin@bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'kepala.hrd' WHERE email = 'kepala.hrd@bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'staf.hrd' WHERE email = 'staf.hrd@bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'alfiani' WHERE email = 'alfiani@intern.bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'budi' WHERE email = 'budi@intern.bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'eki' WHERE email = 'eki@intern.bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'elsya' WHERE email = 'elsya@intern.bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'puan' WHERE email = 'puan@intern.bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'novita' WHERE email = 'novita@intern.bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'felisitas' WHERE email = 'felisitas@intern.bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'listiyani' WHERE email = 'listiyani@intern.bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'mustika' WHERE email = 'mustika@intern.bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'rizq' WHERE email = 'rizq@intern.bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'nesya' WHERE email = 'nesya@intern.bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'bintang' WHERE email = 'bintang@intern.bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'rosmita' WHERE email = 'rosmita@intern.bprsehat.com' AND (username IS NULL OR username = '');
UPDATE users SET username = 'valdis' WHERE email = 'valdis@intern.bprsehat.com' AND (username IS NULL OR username = '');

-- Fallback untuk akun lain jika ada yang belum terisi
UPDATE users 
SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-zA-Z0-9_.]', '', 'g'))
WHERE username IS NULL OR username = '';

-- Pastikan username tidak null dan buat index UNIQUE
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);

-- Buat email menjadi opsional (nullable) dan lepas unique constraint email
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Indeks untuk pencarian cepat username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(LOWER(username));
