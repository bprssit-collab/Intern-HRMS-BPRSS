# 🏢 Sistem Informasi Manajemen Absensi Magang (Intern HRMS)
### PT BPR Sehat Sejahtera

Sistem manajemen sumber daya manusia (HRMS) modern berbasis web yang dirancang khusus untuk memonitor, mengelola, dan merekapitulasi kehadiran mahasiswa magang di **PT BPR Sehat Sejahtera**. Sistem ini dilengkapi dengan verifikasi lokasi kantor (*Geofencing GPS*), pengenalan biometrik wajah berbasis kecerdasan buatan (*AI Face Recognition with 3D Liveness Detection*), matriks rekapitulasi kehadiran horizontal resmi, perhitungan jam kerja otomatis, manajemen hari libur nasional massal, rekapitulasi evaluasi magang, serta perhitungan uang saku otomatis termasuk uang lembur (*Overtime*).

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Arsitektur & Tumpukan Teknologi](#-arsitektur--tumpukan-teknologi)
3. [Matriks Peran Pengguna (5 Roles & Hak Akses)](#-matriks-peran-pengguna-5-roles--hak-akses)
4. [Aturan Bisnis & Algoritma Kehadiran](#-aturan-bisnis--algoritma-kehadiran)
5. [Sistem Biometrik & Keamanan Wajah](#-sistem-biometrik--keamanan-wajah)
6. [Skema & Struktur Basis Data](#-skema--struktur-basis-data)
7. [Struktur Folder & Modul Aplikasi](#-struktur-folder--modul-aplikasi)
8. [Daftar Endpoint API](#-daftar-endpoint-api)
9. [Panduan Instalasi & Menjalankan Proyek](#-panduan-instalasi--menjalankan-proyek)
10. [Konfigurasi Environment Variables](#-konfigurasi-environment-variables)
11. [Panduan Penggunaan Fitur Kunci](#-panduan-penggunaan-fitur-kunci)
12. [Dokumen Pengujian & UAT](#-dokumen-pengujian--uat)

---

## ✨ Fitur Utama

### 1. Portal Absensi Mahasiswa Magang (*Intern Portal*)
- **Pendaftaran Wajah Interaktif (3-Step Enrollment)**: Perekaman biometrik 3 sudut (*Hadap Depan*, *Deteksi Keaktifan Menoleh*, dan *Konfirmasi Depan*) yang menghasilkan vektor embeddings 128-dimensi FaceNet. Sekali daftar terkunci demi integritas data.
- **Validasi Dua Tahap (Two-Factor Attendance)**:
  - **Tahap 1 - Geofence GPS**: Perhitungan jarak akurat dari kantor pusat menggunakan formula *Haversine Spherical Distance*. Absen hanya dapat diproses bila pengguna berada di dalam radius toleransi kantor.
  - **Tahap 2 - AI Face Recognition**: Pemindaian wajah langsung dengan verifikasi ambang batas ketat (*strict threshold* $d \le 0.48$), mencegah titip absen atau manipulasi foto statis.
- **Pemisahan Jalur Khusus Intern HRD**:
  - Mahasiswa magang berposisi di divisi SDM (`intern_hrd`) memiliki akses ke portal HRD untuk tugas operasional tanpa kehilangan fasilitas absensi mandiri melalui menu **/hrd/my-attendance** dan **/hrd/my-face**.
- **Dashboard Riwayat Pribadi**: Visualisasi status check-in, check-out, ringkasan jam kerja harian, akumulasi jam kerja bulanan, dan status persetujuan lembur.

### 2. Portal HRD & Manajemen (*HRD & Admin Portal*)
- **Matriks Rekapitulasi Absensi Horizontal**:
  - Format matriks resmi standar perbankan PT BPR Sehat Sejahtera.
  - Pengelompokan baris per bagian/departemen (*CS*, *Teller UNPAM*, *SDM*, *Accounting*, *Kepatuhan*, *Kredit*, *Audit*, *Social Media*, *Umum*).
  - Penomoran minggu otomatis (*Minggu 1, Minggu 2, dst.*) yang dihitung presisi dari tanggal awal dimulainya batch magang.
  - Tampilan default otomatis 2 minggu (minggu berjalan s/d minggu depan).
  - Penandaan hari libur akhir pekan (*weekend highlight*) dan hari libur nasional resmi.
  - Ringkasan total kehadiran per mahasiswa (*Hadir Penuh [H]*, *Setengah Hari [1/2]*, *Izin [I]*, *Sakit [S]*, *Alpa [A]*, dan *Hadir Lembur [HL]*).
  - Kolom **Keterangan Rinci** untuk audit trail perizinan.
  - Ekspor data ke format **Excel (CSV)** dengan encoding UTF-8 BOM dan fitur **Cetak / PDF** siap print kertas landscape.
- **Konfigurasi Jam Kerja Resmi (`/hrd/work-hours`)**:
  - Pengaturan fleksibel batas jam masuk resmi (`08:30`), batas toleransi telat (`10:30`), dan batas jam pulang resmi (`16:00`).
  - Penentuan otomatis status Hadir Penuh (`H`) atau Setengah Hari (`1/2`) berdasarkan kepatuhan jam absen masuk dan pulang.
  - Khusus dikelola oleh `super_admin`.
- **Manajemen Hari Libur Nasional & Cuti Bersama (`/hrd/holidays`)**:
  - Kalender hari libur resmi dengan penanda kategori (*Libur Nasional*, *Cuti Bersama*, *Libur Perusahaan*).
  - Fitur **Tambah Jadwal Libur Secara Massal**:
    - **Metode 1 (Salin/Tempel Teks)**: Menerima paste teks daftar libur (misal dari SKB 3 Menteri atau Excel) dengan format fleksibel `YYYY-MM-DD - Nama Libur (Kategori)` disertai live syntax preview dan validasi instan.
    - **Metode 2 (Input Baris Cepat)**: Form dinamis multi-baris responsif dengan tombol tambah baris cepat (+1 Baris, +3 Baris).
  - Ringkasan statistik libur pada periode batch aktif yang langsung mengkalkulasi hari kerja efektif.
- **Rekapitulasi Evaluasi & Penilaian Magang (`/hrd/internship-summary`)**:
  - Laporan komprehensif kehadiran seluruh periode batch magang.
  - Metrik utama: **Total Hari Masuk** (Hadir Penuh + 1/2 Hari), **Total Akumulasi Jam Kerja**, serta **Persentase Kehadiran** terhadap **Hari Kerja Efektif**.
  - Dilengkapi fitur Filter Departemen/Bagian, Pencarian nama anak magang, Ekspor CSV, dan Cetak Lembar Penilaian Resmi.
- **Perhitungan Uang Saku & Lembur (*Payout Calculator*)**:
  - Menghitung akumulasi honor magang secara transparan.
  - Mendukung tarif kehadiran normal (*Full Day* / *Half Day*), hari perbantuan, dan uang lembur akhir pekan/hari libur (*Overtime* default Rp 50.000 / hari).
- **Manajemen Batch & Tarif**:
  - Manajemen masa bakti magang (contoh: Batch 15 periode 01 September 2026 s/d 15 Januari 2027).
  - Pengaturan tarif harian normal, tarif perbantuan, dan tarif lembur.
- **Manajemen Akun Pengguna & Hak Akses (Super Admin Only)**:
  - Pembuatan akun baru satuan maupun bulk, peremajaan data profil, reset password akun (default mahasiswa: `internBSS`).
  - Fitur pengubahan role pengguna (misal promosi `intern` menjadi `intern_hrd`).
  - Fitur reset biometrik wajah untuk pendaftaran ulang.
  - Fitur **Hapus Rekaman Absen Hari Ini** jika terjadi kendala teknis absen.

---

## 🛠 Arsitektur & Tumpukan Teknologi

```
+-------------------------------------------------------------------------+
|                                CLIENT                                   |
|   Next.js 16 (App Router + Turbopack) + React 19 + Tailwind CSS         |
|   Client-side AI: face-api.js (TinyFaceDetector, 68-Landmarks, FaceNet) |
|   Geolocation: Web Geolocation API + Haversine Metric Calculation       |
+------------------------------------+------------------------------------+
                                     |  HTTPS / REST JSON
+------------------------------------+------------------------------------+
|                                SERVER                                   |
|   Next.js Server Routes (Node.js runtime)                               |
|   Authentication: Jose JWT in HTTP-Only Secure Cookie + RBAC Guard      |
|   Dual-Layer Biometric Verification (Euclidean Distance Validation)     |
|   Work Hours Engine & Effective Days Calculator (Holiday-Aware)         |
|   Matrix & Payout Aggregator Engine                                     |
+------------------------------------+------------------------------------+
                                     |  Supabase Client / Service Role
+------------------------------------+------------------------------------+
|                               DATABASE                                  |
|   Supabase PostgreSQL / Cloud SQL (with migration v1-v6)                |
|   Tables: users, batches, attendance, settings, holidays, roles         |
|   Row Level Constraints, Foreign Keys & Audit Trail Logs                |
+-------------------------------------------------------------------------+
```

| Lapisan | Komponen / Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (Turbopack) | App Router, Server Components, Route Handlers |
| **Bahasa** | TypeScript 5 | Strict typing untuk kehandalan sistem enterprise |
| **UI Styling** | Tailwind CSS + Glassmorphism | Tema gelap modern, palet warna korporat perbankan |
| **Kecerdasan Buatan** | `face-api.js` (TensorFlow.js) | Deteksi wajah 68 landmark & ekstraksi embedding 128D |
| **Matematika Biometrik** | Pure TypeScript (`face-math.ts`) | Ambang batas $d \le 0.48$ & Cosine Similarity |
| **Database** | PostgreSQL via Supabase | Penyimpanan relasional, RLS, dan JSONB App Config fallback |
| **Autentikasi** | Jose JWT + Bcrypt | Token sesi di-encode di cookie HTTP-Only `auth_token` |
| **Hosting & CI/CD** | Vercel Platform & GitHub | Continuous Deployment tersambung ke branch `main` |

---

## 👥 Matriks Peran Pengguna (5 Roles & Hak Akses)

Sistem membedakan wewenang ke dalam 5 tingkatan peran (*Role-Based Access Control*):

| Hak Akses / Fitur | Intern | Intern HRD (`intern_hrd`) | Staf HRD (`staf_hrd`) | Kepala HRD (`kepala_hrd`) | Super Admin (`super_admin`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Absen Mandiri (Kamera & GPS)** | ✅ | ✅ *(di `/hrd/my-attendance`)* | ❌ | ❌ | ❌ |
| **Pendaftaran & Rekam Wajah** | ✅ | ✅ *(di `/hrd/my-face`)* | ❌ | ❌ | ❌ |
| **Dashboard Magang Pribadi** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Akses Portal HRD** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Melihat Rekap Kehadiran Horizontal** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Mengisi Status Izin/Sakit/Alpa (S/I/A)** | ❌ | ✅ *(Maks 1x pada sel kosong)* | ✅ *(Maks 3x edit)* | ✅ *(Maks 5x edit)* | ✅ *(Bebas/unlimited)* |
| **Memilih & Mengubah Kode Hadir (H / 1/2 / HL)** | ❌ | ❌ *(Terkunci)* | ✅ *(Maks 3x edit)* | ✅ *(Maks 5x edit)* | ✅ *(Bebas/unlimited)* |
| **Kelola Daftar Mahasiswa Magang** | ❌ | ❌ *(Disembunyikan)* | ✅ | ✅ | ✅ |
| **Manajemen Batch & Tarif Uang Saku** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Rekapitulasi Uang Saku & Lembur** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Rekap Evaluasi & Penilaian Magang** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Kelola Hari Libur & Import Massal** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Pengaturan Jam Kerja Resmi** | ❌ | ❌ | ❌ | ❌ | ✅ *(Super Admin)* |
| **Ubah Titik Lokasi & Radius Kantor** | ❌ | ❌ | ❌ | ❌ | ✅ *(Super Admin)* |
| **Manajemen Akun, Divisi & Role** | ❌ | ❌ | ❌ | ❌ | ✅ *(Super Admin)* |
| **Reset Data Wajah Mahasiswa** | ❌ | ❌ | ❌ | ❌ | ✅ *(Super Admin)* |
| **Hapus / Kosongkan Sel Absensi** | ❌ | ❌ | ❌ | ❌ | ✅ *(Super Admin)* |

---

## ⏱ Aturan Bisnis & Algoritma Kehadiran

### 1. Klasifikasi Status Jam Masuk & Pulang
Berdasarkan konfigurasi jam kerja (`work_start_time`, `full_day_max_in`, `work_end_time`):

| Waktu Check-In | Waktu Check-Out | Status Kehadiran | Kode Absen | Keterangan |
| :---: | :---: | :---: | :---: | :--- |
| $\le \text{08:30}$ | $\ge \text{16:00}$ | `full_day` | **H** | Hadir Tepat Waktu Penuh |
| $> \text{08:30}$ dan $\le \text{10:30}$ | $\ge \text{16:00}$ | `half_day` | **1/2** | Terlambat (Masih di bawah toleransi 10:30) |
| $> \text{10:30}$ | $\ge \text{16:00}$ | `half_day` | **1/2** | Terlambat Sangat Siang |
| Kapan saja | $< \text{16:00}$ | `half_day` | **1/2** | Pulang Sebelum Waktunya |
| Akhir Pekan / Hari Libur | $\ge \text{4 jam}$ (Lembur Disetujui) | `full_day` | **HL** | Hadir Lembur / Perbantuan Khusus |

### 2. Perhitungan Hari Kerja Efektif
Hari kerja efektif digunakan sebagai acuan $100\%$ kehadiran untuk penilaian akhir magang pada halaman `/hrd/internship-summary`:

$$\text{Hari Kerja Efektif} = \text{Total Hari Kalender Batch} - \text{Sabtu} - \text{Minggu} - \text{Hari Libur Nasional / Cuti Bersama yang jatuh di Senin–Jumat}$$

$$\text{Persentase Kehadiran (\%)} = \left( \frac{\text{Total Hari Masuk (H + 1/2)}}{\text{Hari Kerja Efektif}} \right) \times 100\%$$

---

## 🔒 Sistem Biometrik & Keamanan Wajah

### 1. Ekstraksi Biometrik Wajah
Model biometrik menggunakan arsitektur ResNet-34 FaceNet yang memetakan kontur wajah ke dalam **vektor embedding 128-dimensi** bernilai riil dengan normalisasi L2 ($||x|| = 1$).

### 2. Ambang Batas Jarak Euclidean (*Threshold Calibration*)
Perbandingan antara wajah langsung di kamera (*live*) dan vektor acuan di database (*stored*) diukur menggunakan **Jarak Euclidean**:

$$d(a, b) = \sqrt{\sum_{i=1}^{128} (a_i - b_i)^2}$$

Hubungan antara Jarak Euclidean ($d$) dan Kemiripan Cosine (*Cosine Similarity*):
$$\cos(\theta) = 1 - \frac{d^2}{2}$$

| Rentang Jarak ($d$) | Kemiripan ($\cos \theta$) | Kategori | Keputusan Sistem |
| :---: | :---: | :---: | :---: |
| **$0.00 - 0.35$** | **$94\% - 100\%$** | Orang yang sama (kondisi optimal) | **VALID (Lolos)** |
| **$0.36 - 0.48$** | **$88.5\% - 93\%$** | Orang yang sama (variasi sudut/cahaya) | **VALID (Lolos)** |
| **$0.49 - 0.65$** | **$79\% - 88\%$** | Orang berbeda / rekan kerja mirip | **DITOLAK (Akses Diblokir)** |
| **$> 0.65$** | **$< 79\%$** | Orang yang sama sekali berbeda | **DITOLAK (Akses Diblokir)** |

> **Ambang Batas Keamanan**: Ambang batas dikunci pada **$d \le 0.48$**. Sistem melakukan verifikasi ganda di sisi server (*server-side verification*) sebelum transaksi check-in/out disimpan.

---

## 🗄 Skema & Struktur Basis Data

### 1. Tabel `users`
Menyimpan kredensial pengguna, profil departemen, role, dan vektor biometrik.
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('intern', 'intern_hrd', 'staf_hrd', 'kepala_hrd', 'super_admin')),
  department TEXT, -- CS, Teller UNPAM, SDM, Accounting, Kepatuhan, Kredit, Audit, Social Media, Umum
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'perbantuan', 'completed')),
  face_descriptor FLOAT8[], -- 128-float array FaceNet embeddings
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Tabel `batches`
Menyimpan periode gelombang magang dan tarif harian serta tarif lembur.
```sql
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number INT NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  full_day_rate NUMERIC DEFAULT 20000,
  half_day_rate NUMERIC DEFAULT 10000,
  perbantuan_full_day_rate NUMERIC DEFAULT 50000,
  perbantuan_half_day_rate NUMERIC DEFAULT 25000,
  overtime_rate INT NOT NULL DEFAULT 50000,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. Tabel `attendance`
Menyimpan rekaman presensi harian, audit perizinan, dan status lembur.
```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_lat FLOAT8,
  check_in_long FLOAT8,
  distance_from_office FLOAT8,
  status TEXT CHECK (status IN ('full_day', 'half_day', 'pending')),
  attendance_status TEXT CHECK (attendance_status IN ('H', '1/2', 'I', 'S', 'A', 'HL')),
  is_perbantuan BOOLEAN DEFAULT false,
  is_overtime BOOLEAN NOT NULL DEFAULT false,
  overtime_approved BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  edit_count INT NOT NULL DEFAULT 0,
  last_edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);
```

### 4. Tabel `settings`
Menyimpan konfigurasi geofence dan konfigurasi jam kerja resmi.
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_lat FLOAT8 NOT NULL DEFAULT -6.3475,
  office_long FLOAT8 NOT NULL DEFAULT 106.6915,
  max_radius_meters INT NOT NULL DEFAULT 150,
  full_day_rate NUMERIC DEFAULT 20000,
  half_day_rate NUMERIC DEFAULT 10000,
  perbantuan_full_day_rate NUMERIC DEFAULT 50000,
  perbantuan_half_day_rate NUMERIC DEFAULT 25000,
  work_start_time VARCHAR(5) NOT NULL DEFAULT '08:30',
  full_day_max_in VARCHAR(5) NOT NULL DEFAULT '10:30',
  work_end_time   VARCHAR(5) NOT NULL DEFAULT '16:00',
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5. Tabel `holidays`
Menyimpan kalender hari libur nasional, cuti bersama, dan libur perusahaan.
```sql
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'national' CHECK (type IN ('national', 'cuti_bersama', 'company')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 📂 Struktur Folder & Modul Aplikasi

```
intern-hrms/
├── docs/
│   └── UAT_DOKUMEN_INTERN_HRMS_BPRSS.md # Dokumen User Acceptance Testing (33 Test Cases)
├── public/
│   └── models/               # Model bobot pra-terlatih face-api.js
├── src/
│   ├── app/
│   │   ├── api/              # REST Route Handlers
│   │   │   ├── admin/
│   │   │   │   ├── departments/      # Manajemen daftar departemen
│   │   │   │   ├── reset-attendance-today/ # Hapus absen hari ini
│   │   │   │   ├── reset-face/       # Reset biometrik wajah
│   │   │   │   ├── roles/            # Manajemen permission roles
│   │   │   │   ├── users/            # CRUD user & bulk create
│   │   │   │   └── work-hours/       # API konfigurasi jam kerja
│   │   │   ├── attendance/
│   │   │   │   ├── checkin/          # Verifikasi GPS + Face Check-in
│   │   │   │   ├── checkout/         # Verifikasi Face + Status jam kerja
│   │   │   │   ├── my-history/       # Riwayat absen user login
│   │   │   │   └── reset-today/      # Reset mandiri hari ini
│   │   │   ├── auth/
│   │   │   │   ├── change-credentials/ # Ganti email / password
│   │   │   │   ├── login/            # Otentikasi JWT Cookie
│   │   │   │   ├── logout/           # Hapus sesi login
│   │   │   │   └── me/               # Profil pengguna aktif
│   │   │   ├── hrd/
│   │   │   │   ├── attendance-history/ # Riwayat absensi seluruh anak magang
│   │   │   │   ├── attendance-recap/   # Matriks horizontal & update S/I/A
│   │   │   │   ├── batches/            # Periode batch & tarif uang saku
│   │   │   │   ├── holidays/           # CRUD & Bulk import hari libur
│   │   │   │   ├── interns/            # Daftar & status anak magang
│   │   │   │   ├── internship-summary/ # Rekapitulasi evaluasi magang
│   │   │   │   └── payout/             # Rekapitulasi uang saku & lembur
│   │   │   ├── settings/             # Konfigurasi Geofence & Tarif
│   │   │   └── users/                # Register Face & Profil
│   │   ├── hrd/              # Halaman Antarmuka Portal HRD & Administrator
│   │   │   ├── attendance-history/   # Log riwayat kehadiran
│   │   │   ├── attendance-recap/     # Matriks horizontal absensi mingguan
│   │   │   ├── batches/              # Manajemen periode batch
│   │   │   ├── dashboard/            # Ringkasan analitik HRD
│   │   │   ├── departments/          # Manajemen departemen
│   │   │   ├── holidays/             # Manajemen hari libur & bulk import
│   │   │   ├── interns/              # Daftar anak magang (disembunyikan dari intern_hrd)
│   │   │   ├── internship-summary/   # Rekap evaluasi & penilaian magang
│   │   │   ├── my-attendance/        # Absensi mandiri khusus Intern HRD
│   │   │   ├── my-face/              # Pendaftaran wajah khusus Intern HRD
│   │   │   ├── payout/               # Rekapitulasi uang saku & lembur
│   │   │   ├── roles/                # Konfigurasi peran & hak akses
│   │   │   ├── settings/             # Pengaturan titik GPS & radius kantor
│   │   │   ├── users/                # Manajemen akun pengguna (Super Admin)
│   │   │   ├── work-hours/           # Konfigurasi jam kerja resmi (Super Admin)
│   │   │   └── layout.tsx            # Sidebar responsif & role guard portal HRD
│   │   ├── intern/           # Halaman Antarmuka Portal Mahasiswa Magang
│   │   │   ├── attendance/           # Halaman absen GPS + Biometrik
│   │   │   ├── dashboard/            # Dashboard riwayat mahasiswa
│   │   │   ├── register-face/        # Pendaftaran wajah 3 sudut
│   │   │   └── layout.tsx            # Navigasi portal mahasiswa
│   │   ├── globals.css       # Styling utilitas Tailwind & tema Glassmorphism
│   │   ├── layout.tsx        # Root HTML layout
│   │   └── page.tsx          # Halaman login utama
│   ├── components/
│   │   ├── face-capture.tsx  # Komponen kamera HUD, 3D liveness & capture
│   │   ├── geofence-checker.tsx # Komponen GPS radar & validasi radius
│   │   └── ui/               # Komponen tombol, kartu, modal, dan input
│   ├── lib/
│   │   ├── auth.ts           # Manajemen token JWT & verifikasi sesi
│   │   ├── constants.ts      # Default jam kerja, hari libur 2026, tarif
│   │   ├── face-api.ts       # Loader model & deteksi wajah browser
│   │   ├── face-math.ts      # Logika perbandingan Euclidean & threshold
│   │   ├── haversine.ts      # Perhitungan jarak radius bumi (Haversine)
│   │   ├── permissions.ts    # Matriks izin edit & policy 5 roles
│   │   ├── payout-calc.ts    # Kalkulasi uang saku normal & uang lembur
│   │   ├── supabase.ts       # Supabase Client & Service Role Admin
│   │   ├── utils.ts          # Format tanggal Indonesia & helper
│   │   └── work-config.ts    # Helper persistensi jam kerja, libur & lembur
│   └── types/
│       └── index.ts          # Definisi interface TypeScript global
├── supabase/
│   ├── schema.sql            # Skema DDL lengkap basis data
│   ├── migration_v2.sql      # Migrasi 5 peran & batch 15
│   ├── migration_v3.sql      # Migrasi izin & audit trail
│   ├── migration_v4_departments.sql # Migrasi tabel departemen
│   ├── migration_v5_roles.sql       # Migrasi tabel peran dinamis
│   └── migration_v6_holidays_worktime_overtime.sql # Migrasi libur, jam kerja & lembur
├── .env.local                # Kredensial lingkungan kerja
├── next.config.ts            # Konfigurasi Next.js
├── package.json              # Dependensi npm
└── tsconfig.json             # Konfigurasi compiler TypeScript
```

---

## 🔌 Daftar Endpoint API

### 1. Autentikasi (`/api/auth`)
- `POST /api/auth/login`: Menerima email dan password, memverifikasi hash bcrypt, menghasilkan HTTP-only cookie JWT `auth_token`.
- `POST /api/auth/logout`: Menghapus sesi dan cookie login.
- `GET /api/auth/me`: Mengembalikan data pengguna aktif yang sedang login.
- `PUT /api/auth/change-credentials`: Mengubah email, nama, atau password akun sendiri.

### 2. Absensi Magang (`/api/attendance`)
- `POST /api/attendance/checkin`: Menerima latitude, longitude, jarak meter, dan `face_descriptor` (128 float). Memverifikasi radius geofence dan biometrik wajah sebelum mencatat jam masuk.
- `POST /api/attendance/checkout`: Menerima `face_descriptor`, memverifikasi biometrik, menghitung durasi jam kerja, dan menentukan status kehadiran (`full_day` atau `half_day`) berdasarkan konfigurasi jam kerja resmi.
- `GET /api/attendance/my-history`: Mengambil histori absensi pribadi mahasiswa yang sedang login.
- `POST /api/attendance/reset-today`: Menghapus rekaman absensi hari berjalan (jika diizinkan).

### 3. Pendaftaran Biometrik Wajah (`/api/users`)
- `GET /api/users/me`: Mengambil profil dan status biometrik wajah.
- `POST /api/users/register-face`: Menyimpan array `face_descriptor` (128 float) ke dalam database (hanya bisa 1x kecuali di-reset Super Admin).

### 4. Portal HRD (`/api/hrd`)
- `GET /api/hrd/attendance-recap`: Mengambil struktur matriks kehadiran horizontal berdasarkan filter batch dan rentang tanggal, dikelompokkan per divisi, lengkap dengan nomor minggu, summary kode, dan keterangan rinci.
- `PUT /api/hrd/attendance-recap`: Memperbarui status kehadiran atau catatan perizinan sel absensi tertentu dengan penegakan izin peran (*Permission Policy*).
- `GET /api/hrd/batches`: Mengambil daftar seluruh gelombang magang (*batches*).
- `POST /api/hrd/batches`: Menambah atau memperbarui gelombang magang, rentang tanggal, tarif harian, dan tarif lembur.
- `GET /api/hrd/interns`: Mengambil daftar seluruh mahasiswa magang beserta status aktif/perbantuan.
- `GET /api/hrd/payout`: Mengambil rekapitulasi uang saku magang dan uang lembur berdasarkan akumulasi kehadiran.
- `GET /api/hrd/holidays`: Mengambil daftar hari libur nasional, cuti bersama, dan libur perusahaan, lengkap dengan statistik libur pada batch aktif.
- `POST /api/hrd/holidays`: Menambah satu atau banyak (*bulk upsert*) hari libur ke dalam sistem.
- `DELETE /api/hrd/holidays`: Menghapus data hari libur berdasarkan tanggal.
- `GET /api/hrd/internship-summary`: Mengambil ringkasan evaluasi magang seluruh batch (Total Hari Masuk, Total Jam Kerja, Hari Kerja Efektif, dan Persentase Kehadiran).

### 5. Khusus Administrator (`/api/admin`)
- `GET /api/admin/work-hours`: Mengambil konfigurasi jam masuk, batas telat, dan jam pulang resmi.
- `PUT /api/admin/work-hours`: Memperbarui konfigurasi jam kerja resmi (Super Admin only).
- `GET /api/admin/users`: Mengambil daftar akun pengguna dengan filter pencarian dan role.
- `POST /api/admin/users`: Membuat akun pengguna baru.
- `POST /api/admin/users/bulk-create`: Membuat akun pengguna dalam jumlah banyak sekaligus.
- `PUT /api/admin/users`: Mengubah data pengguna, role jabatan, departemen, atau password.
- `DELETE /api/admin/users`: Menghapus akun pengguna dari sistem.
- `POST /api/admin/reset-face`: Mengosongkan data biometrik wajah mahasiswa magang untuk pendaftaran ulang.
- `GET /api/admin/reset-attendance-today`: Melihat daftar absensi masuk hari ini.
- `POST /api/admin/reset-attendance-today`: Menghapus rekaman absensi hari ini milik mahasiswa tertentu agar dapat absen ulang.
- `GET /api/admin/departments`: Mengambil daftar departemen/bagian.
- `POST /api/admin/departments`: Menambah atau mengubah departemen.
- `GET /api/admin/roles`: Mengambil daftar role dan permissions.
- `PUT /api/admin/roles`: Memperbarui hak akses role.

---

## 🚀 Panduan Instalasi & Menjalankan Proyek

### Prasyarat
- **Node.js**: Versi 18.18.0 atau lebih tinggi (disarankan Node.js 20 LTS atau 22).
- **NPM** atau **Yarn** / **PNPM**.
- Proyek **Supabase** (atau basis data PostgreSQL).

### Langkah Instalasi
1. **Clone Repository**:
   ```bash
   git clone https://github.com/bprssit-collab/Intern-HRMS-BPRSS.git
   cd intern-hrms
   ```

2. **Install Dependensi**:
   ```bash
   npm install
   ```

3. **Setup Environment Variables**:
   Buat file `.env.local` di root folder proyek (lihat bagian [Konfigurasi Environment Variables](#-konfigurasi-environment-variables)).

4. **Jalankan Skrip Basis Data**:
   Buka **SQL Editor** pada Dashboard Supabase Anda, lalu eksekusi file migrasi berikut secara berurutan:
   - `supabase/schema.sql` (skema basis data awal)
   - `supabase/migration_v2.sql` (5 peran pengguna & batch 15)
   - `supabase/migration_v3.sql` (audit trail & edit policy)
   - `supabase/migration_v4_departments.sql` (departemen resmi bank)
   - `supabase/migration_v5_roles.sql` (tabel roles & konfigurasi izin)
   - `supabase/migration_v6_holidays_worktime_overtime.sql` (tabel holidays, jam kerja, dan lembur)

5. **Jalankan Server Lokal (Development)**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000`.

6. **Build Produksi**:
   ```bash
   npm run build
   npm run start
   ```

---

## 🔑 Konfigurasi Environment Variables

File `.env.local` di root direktori proyek:
```env
# ============================================================
# PT BPR Sehat Sejahtera - Konfigurasi Supabase
# ============================================================
NEXT_PUBLIC_SUPABASE_URL=https://rmirmixvuevlmsfifrjq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxx
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxx

# Secret Key (Server-Side Only - Jangan di-publish ke publik)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxx

# Kunci Rahasia JWT Session Cookie
JWT_SECRET=bprss_intern_hrms_super_secure_jwt_secret_key_2026
```

---

## 📖 Panduan Penggunaan Fitur Kunci

### 1. Akun Bawaan Sistem (*Default Accounts*)
| Role | Email | Password Default | Penempatan |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@bprsehat.com` | `admin123` | Kantor Pusat / IT |
| **Kepala HRD** | `kepala.hrd@bprsehat.com` | `kepala123` | Divisi SDM |
| **Staf HRD** | `staf.hrd@bprsehat.com` | `staf123` | Divisi SDM |
| **Intern HRD** | `alfiani@intern.bprsehat.com` | `internBSS` | Divisi SDM |
| **Intern Biasa** | `budi@intern.bprsehat.com` | `internBSS` | Divisi CS / Teller |

> *Catatan*: Seluruh akun mahasiswa magang baru memiliki password default **`internBSS`**. Pengguna dapat memperbarui password masing-masing melalui menu profil.

### 2. Alur Absensi Mahasiswa Magang
1. Mahasiswa login menggunakan email magang dan password `internBSS`.
2. Jika belum pernah mendaftarkan wajah, sistem otomatis mengarahkan ke halaman **/intern/register-face** (atau **/hrd/my-face** untuk Intern HRD).
3. Posisikan wajah di lingkaran kamera: ikuti panduan hadap lurus, tolehkan kepala untuk verifikasi keaktifan 3D, dan konfirmasi akhir.
4. Buka menu **/intern/attendance** (atau **/hrd/my-attendance**):
   - Izinkan akses lokasi browser (*GPS Geolocation*).
   - Pastikan radar GPS berwarna hijau (*Di dalam area kantor*).
   - Tatap kamera untuk verifikasi biometrik wajah. Dalam hitungan 2 detik, sistem akan mencocokkan embedding wajah dengan basis data ($d \le 0.48$).
   - Jam masuk tercatat otomatis.
5. Saat jam pulang kerja tiba, buka kembali menu absensi dan tatap kamera untuk check-out. Status Hadir Penuh (`H`) atau Setengah Hari (`1/2`) ditentukan otomatis berdasarkan jam masuk dan jam pulang.

### 3. Alur Pengelolaan Rekapitulasi oleh HRD
1. Staf/Kepala HRD atau Super Admin membuka **/hrd/attendance-recap**.
2. Secara default sistem menyajikan rentang 2 minggu (minggu berjalan s/d minggu depan) sesuai format matriks BPR Sehat Sejahtera.
3. Klik sel tanggal anak magang bersangkutan:
   - Pilih kode kehadiran: **H** (Hadir Penuh), **1/2** (Setengah Hari), **I** (Izin), **S** (Sakit), **A** (Alpa), atau **HL** (Hadir Lembur).
   - Tuliskan alasan di kolom **Keterangan Rinci**.
   - Simpan status.
4. Klik **Ekspor Excel (CSV)** untuk mengunduh laporan bulanan atau klik **Cetak / PDF** untuk cetak rekapitulasi kehadiran resmi ke kertas landscape.

### 4. Alur Tambah Hari Libur Massal
1. Buka menu **/hrd/holidays**, lalu klik tombol **+ Tambah Libur Massal**.
2. **Pilihan Metode 1 (Salin/Tempel Teks)**:
   - Salin daftar libur dari pengumuman pemerintah atau Excel (contoh baris: `2026-05-01 - Hari Buruh Internasional (Libur Nasional)`).
   - Tempel ke textarea, sistem akan menampilkan preview instan baris valid dan baris tidak valid.
   - Klik **Simpan Semua Hari Libur**.
3. **Pilihan Metode 2 (Input Baris Cepat)**:
   - Gunakan form dinamis dengan memilih tanggal, mengetik nama libur, dan memilih jenis libur.
   - Tambah baris dengan tombol **+ Tambah 1 Baris** atau **+ Tambah 3 Baris**.
   - Klik **Simpan Semua Hari Libur**.

### 5. Alur Rekapitulasi Evaluasi Magang
1. Buka menu **/hrd/internship-summary**.
2. Pilih batch aktif (misal Batch 15).
3. Sistem secara otomatis menghitung:
   - **Hari Kerja Efektif**: Total hari kerja Senin–Jumat dikurangi seluruh Hari Libur Nasional & Cuti Bersama yang terdaftar.
   - **Total Hari Masuk**: Akumulasi hari kehadiran tiap mahasiswa (Hadir Penuh dan Setengah Hari).
   - **Total Jam Kerja**: Akumulasi total jam kehadiran nyata.
   - **Persentase Kehadiran**: Persentase kehadiran terhadap hari kerja efektif.
4. HRD dapat mengekspor data ke Excel atau mencetak lembar evaluasi resmi untuk arsip universitas / sertifikat magang.

---

## 🧪 Dokumen Pengujian & UAT

Pengujian sistem dilakukan secara menyeluruh dan terdokumentasi pada berkas:
- [`docs/UAT_DOKUMEN_INTERN_HRMS_BPRSS.md`](file:///c:/Users/USER/.gemini/antigravity-ide/scratch/intern-hrms/docs/UAT_DOKUMEN_INTERN_HRMS_BPRSS.md)

Dokumen UAT mencakup **33 Test Cases** terstruktur:
- **TC-AUTH-01 s/d 04**: Login 5 role, penolakan password salah, proteksi rute, dan session cookie.
- **TC-BIO-01 s/d 05**: Pendaftaran wajah 3D liveness, matching $d \le 0.48$, penolakan wajah orang lain, dan proteksi re-enrollment.
- **TC-GEO-01 s/d 03**: Geofencing dalam radius, di luar radius, dan deteksi GPS mati.
- **TC-ATT-01 s/d 04**: Check-in, check-out, kalkulasi jam kerja, dan cegah double check-in.
- **TC-HOURS-01 s/d 04**: Evaluasi jam kerja resmi (tepat waktu `08:30`, batas telat `10:30`, pulang cepat `< 16:00`), dan konfigurasi jam kerja oleh super admin.
- **TC-REKAP-01 s/d 07**: Matriks rekapitulasi horizontal, penomoran minggu, edit S/I/A, penguncian edit intern_hrd, weekend highlight, ekspor CSV, dan bulk import hari libur massal.
- **TC-PAYOUT-01 s/d 03**: Perhitungan uang saku, tarif perbantuan, dan tarif lembur akhir pekan/hari libur.
- **TC-HOLIDAY-01 s/d 03**: Hari kerja efektif, kalkulasi pengurang libur nasional, dan sinkronisasi hari kerja.

---

## 📄 Lisensi & Hak Cipta
Hak Cipta © 2026 **PT BPR Sehat Sejahtera**. Seluruh hak cipta dilindungi undang-undang. Sistem ini dikembangkan untuk kebutuhan operasional internal bank.
