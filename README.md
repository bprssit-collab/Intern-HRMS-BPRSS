# 🏢 Sistem Informasi Manajemen Absensi Magang (Intern HRMS)
### PT BPR Sehat Sejahtera

Sistem manajemen sumber daya manusia (HRMS) modern berbasis web yang dirancang khusus untuk memonitor, mengelola, dan merekapitulasi kehadiran mahasiswa magang di **PT BPR Sehat Sejahtera**. Sistem ini dilengkapi dengan verifikasi lokasi kantor (*Geofencing GPS*), pengenalan biometrik wajah berbasis kecerdasan buatan (*AI Face Recognition with 3D Liveness Detection*), matriks rekapitulasi kehadiran horizontal resmi, serta perhitungan uang saku otomatis.

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Arsitektur & Tumpukan Teknologi](#-arsitektur--tumpukan-teknologi)
3. [Matriks Peran Pengguna (5 Roles & Hak Akses)](#-matriks-peran-pengguna-5-roles--hak-akses)
4. [Sistem Biometrik & Keamanan Wajah](#-sistem-biometrik--keamanan-wajah)
5. [Skema & Struktur Basis Data](#-skema--struktur-basis-data)
6. [Struktur Folder & Modul Aplikasi](#-struktur-folder--modul-aplikasi)
7. [Daftar Endpoint API](#-daftar-endpoint-api)
8. [Panduan Instalasi & Menjalankan Proyek](#-panduan-instalasi--menjalankan-proyek)
9. [Konfigurasi Environment Variables](#-konfigurasi-environment-variables)
10. [Panduan Penggunaan Fitur Kunci](#-panduan-penggunaan-fitur-kunci)

---

## ✨ Fitur Utama

### 1. Portal Absensi Mahasiswa Magang (*Intern Portal*)
- **Pendaftaran Wajah Interaktif (3-Step Enrollment)**: Perekaman biometrik 3 sudut (*Hadap Depan*, *Deteksi Keaktifan Menoleh*, dan *Konfirmasi Depan*) yang menghasilkan vektor embeddings 128-dimensi FaceNet. Sekali daftar terkunci demi integritas data.
- **Validasi Dua Tahap (Two-Factor Attendance)**:
  - **Tahap 1 - Geofence GPS**: Perhitungan jarak akurat dari kantor pusat menggunakan formula *Haversine Spherical Distance*. Absen hanya dapat diproses bila pengguna berada di dalam radius toleransi kantor.
  - **Tahap 2 - AI Face Recognition**: Pemindaian wajah langsung dengan verifikasi ambang batas ketat (*strict threshold*), mencegah titip absen melalui rekan kerja atau manipulasi foto statis.
- **Dashboard Riwayat Pribadi**: Visualisasi status check-in, check-out, ringkasan jam kerja, serta riwayat kehadiran per bulan.

### 2. Portal HRD & Manajemen (*HRD & Admin Portal*)
- **Matriks Rekapitulasi Absensi Horizontal**:
  - Format resmi standar perbankan PT BPR Sehat Sejahtera.
  - Pengelompokan baris per bagian/departemen (*CS*, *Teller UNPAM*, *SDM*, *Accounting*, *Kepatuhan*, *Kredit*, *Audit*, *Social Media*, *Umum*).
  - Penomoran minggu otomatis (*Minggu 1, Minggu 2, dst.*) yang dihitung presisi dari tanggal awal dimulainya batch magang.
  - Default tampilan otomatis 2 minggu (minggu berjalan s/d minggu depan).
  - Penandaan hari libur akhir pekan (*weekend highlight*).
  - Ringkasan total kehadiran (*Hadir [H]*, *1/2 Hari*, *Izin [I]*, *Sakit [S]*, *Alpa [A]*) beserta kolom **Keterangan Rinci**.
  - Ekspor data ke format **Excel (CSV)** dengan encoding UTF-8 BOM dan fitur **Cetak / PDF** rapi khusus kertas print landscape.
- **Pembaruan Status & Izin Bertingkat**:
  - Modal cepat untuk update status kehadiran dengan aturan hak akses ketat (*Permission Policy Matrix*).
  - Super Admin memiliki tombol khusus untuk **menghapus rekaman absensi hari berjalan** jika anak magang mengalami kendala atau perlu absen ulang.
- **Perhitungan Uang Saku (*Payout Calculator*)**:
  - Menghitung akumulasi honor magang secara transparan.
  - Membedakan tarif kehadiran normal (*Full Day* / *Half Day*) dengan hari penugasan lembur/khusus (*Perbantuan*).
- **Manajemen Batch & Tarif**:
  - Manajemen masa bakti magang (contoh Batch 15: 01 September 2026 s/d 15 Januari 2027).
  - Pengaturan fleksibel tarif harian normal dan perbantuan.
- **Manajemen Akun User (Super Admin Only)**:
  - Pembuatan akun baru, peremajaan data profil, reset password akun.
  - Fitur pengubahan role pengguna (misalnya mempromosikan mahasiswa magang dari `intern` menjadi `intern_hrd` yang ditempatkan di divisi SDM).
  - Fitur reset data biometrik wajah untuk pendaftaran ulang.
- **Pengaturan Lokasi & Radius Kantor**:
  - Konfigurasi titik koordinat latitude, longitude, dan batas radius kantor dalam satuan meter.

---

## 🛠 Arsitektur & Tumpukan Teknologi

```
+-------------------------------------------------------------------------+
|                                CLIENT                                   |
|   Next.js 16 (App Router) + React 19 + Tailwind CSS + Lucide Icons       |
|   Client-side AI: face-api.js (TinyFaceDetector, 68-Landmark, FaceNet)  |
|   Geolocation: Web Geolocation API + Haversine Metric Calculation       |
+------------------------------------+------------------------------------+
                                     |  HTTPS / REST JSON
+------------------------------------+------------------------------------+
|                                SERVER                                   |
|   Next.js Server Routes (Node.js runtime)                               |
|   Authentication: JWT in HTTP-Only Secure Cookie + Role Guard Checks    |
|   Dual-Layer Biometric Verification (Server-Side Euclidean Math)        |
|   Payout & Matrix Engine (Dynamic Weekly Aggregators)                   |
+------------------------------------+------------------------------------+
                                     |  Supabase Client / Service Role
+------------------------------------+------------------------------------+
|                               DATABASE                                  |
|   Supabase PostgreSQL / Cloud SQL (with Local DB JSON fallback)         |
|   Tables: users, batches, attendance, settings                          |
|   Row Level Constraints & Foreign Keys                                  |
+-------------------------------------------------------------------------+
```

| Lapisan | Komponen / Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (Turbopack) | App Router, Server Components, Route Handlers |
| **Bahasa** | TypeScript 5 | Strict typing untuk kehandalan sistem |
| **UI Styling** | Tailwind CSS + Glassmorphism | Tema gelap modern, palet warna korporat perbankan |
| **Kecerdasan Buatan** | `face-api.js` (TensorFlow.js) | Deteksi wajah 68 titik & ekstraksi embedding 128D |
| **Matematika Biometrik** | Pure TypeScript (`face-math.ts`) | Ambang batas $d \le 0.48$ & Cosine Similarity |
| **Database** | PostgreSQL via Supabase | Penyimpanan terkelola dengan Row Security & Audit Trail |
| **Autentikasi** | Jose JWT + Bcrypt | Token sesi di-encode di cookie `auth_token` |
| **Hosting** | Vercel Platform | Continuous Deployment tersambung ke branch `main` |

---

## 👥 Matriks Peran Pengguna (5 Roles & Hak Akses)

Sistem membedakan wewenang ke dalam 5 tingkatan peran (*roles*):

| Hak Akses / Fitur | Intern | Intern HRD (`intern_hrd`) | Staf HRD (`staf_hrd`) | Kepala HRD (`kepala_hrd`) | Super Admin (`super_admin`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Absen Masuk/Pulang (Kamera & GPS)** | ✅ | ✅ *(Anak magang divisi SDM)* | ❌ | ❌ | ❌ |
| **Daftar & Rekam Wajah** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Dashboard Magang Pribadi** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Akses Portal HRD** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Melihat Rekap & Riwayat Absen** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Mengisi S/I/A di Rekap** | ❌ | ✅ *(1x saja)* | ✅ *(1x saja)* | ✅ *(1x saja)* | ✅ *(Bebas/unlimited)* |
| **Mengubah Kode Hadir (H / 1/2)** | ❌ | ❌ *(Terkunci)* | ✅ *(1x saja)* | ✅ *(1x saja)* | ✅ *(Bebas/unlimited)* |
| **Hapus Rekaman Absen Hari Ini** | ❌ | ❌ | ❌ | ❌ | ✅ *(Khusus Super Admin)* |
| **Manajemen Batch & Tarif Uang Saku**| ❌ | ❌ | ✅ | ✅ | ✅ |
| **Rekapitulasi Uang Saku Magang** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Ubah Lokasi & Radius Geofence** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Manajemen Akun User (CRUD & Role)**| ❌ | ❌ | ❌ | ❌ | ✅ *(Menu Administrator)* |
| **Reset Data Wajah Mahasiswa** | ❌ | ❌ | ❌ | ❌ | ✅ *(Menu Administrator)* |

---

## 🔒 Sistem Biometrik & Keamanan Wajah

### 1. Ekstraksi Biometrik Wajah
Model biometrik menggunakan arsitektur ResNet-34 FaceNet yang memetakan fitur wajah manusia ke dalam **vektor embedding 128-dimensi** bernilai riil dengan panjang unit L2 ($||x|| = 1$).

### 2. Kalibrasi Ambang Batas Aman (*Threshold Calibration*)
Perbandingan antara wajah langsung di kamera (*live*) dan vektor di basis data (*stored*) diukur menggunakan **Jarak Euclidean (*Euclidean Distance*)**:

$$d(a, b) = \sqrt{\sum_{i=1}^{128} (a_i - b_i)^2}$$

Hubungan antara Jarak Euclidean ($d$) dan Kemiripan Cosine (*Cosine Similarity*) untuk vektor satuan:
$$\cos(\theta) = 1 - \frac{d^2}{2}$$

| Rentang Jarak ($d$) | Kemiripan ($\cos \theta$) | Kategori | Keputusan Sistem |
| :---: | :---: | :---: | :---: |
| **$0.00 - 0.35$** | **$94\% - 100\%$** | Orang yang sama (kondisi optimal) | **VALID (Lolos)** |
| **$0.36 - 0.48$** | **$88.5\% - 93\%$** | Orang yang sama (beda cahaya/sudut) | **VALID (Lolos)** |
| **$0.49 - 0.65$** | **$79\% - 88\%$** | Rekan kerja / orang lain serupa | **DITOLAK (Akses Diblokir)** |
| **$> 0.65$** | **$< 79\%$** | Orang berbeda | **DITOLAK (Akses Diblokir)** |

> **Catatan Keamanan Penting**: Ambang batas dikunci pada **$d \le 0.48$**. Sistem menolak rekan kerja yang mencoba menggantikan absensi, serta melakukan verifikasi ganda di sisi server (*server-side verification*) sebelum transaksi kehadiran disimpan.

---

## 🗄 Skema & Struktur Basis Data

### 1. Tabel `users`
Menyimpan profil akun, kredensial, departemen penempatan, dan vektor biometrik.
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
Menyimpan data periode gelombang magang dan tarif harian.
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
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. Tabel `attendance`
Menyimpan catatan harian kehadiran, koordinat GPS, status audit, dan catatan rinci.
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
  attendance_status TEXT CHECK (attendance_status IN ('H', '1/2', 'I', 'S', 'A')),
  is_perbantuan BOOLEAN DEFAULT false,
  notes TEXT,
  edit_count INT NOT NULL DEFAULT 0,
  last_edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);
```

### 4. Tabel `settings`
Menyimpan konfigurasi titik acuan kantor dan radius geofence.
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
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 📂 Struktur Folder & Modul Aplikasi

```
intern-hrms/
├── public/
│   └── models/               # Model bobot pra-terlatih face-api.js (tiny_face, landmark, recognition)
├── src/
│   ├── app/
│   │   ├── api/              # REST Route Handlers
│   │   │   ├── admin/        # Reset Face, Reset Absensi Hari Ini, CRUD User
│   │   │   ├── attendance/   # Check-in, Check-out, History
│   │   │   ├── auth/         # Login, Logout, Session Me
│   │   │   ├── hrd/          # Recap, Batches, Interns, Payout
│   │   │   ├── settings/     # Konfigurasi Geofence & Tarif
│   │   │   └── users/        # Register Face & Profil
│   │   ├── hrd/              # Halaman Antarmuka Portal HRD & Administrator
│   │   │   ├── attendance-recap/    # Matriks horizontal absensi mingguan
│   │   │   ├── attendance-history/  # Log riwayat kehadiran
│   │   │   ├── batches/             # Manajemen periode & tarif batch
│   │   │   ├── interns/             # Daftar & status anak magang
│   │   │   ├── payout/              # Rekapitulasi uang saku magang
│   │   │   ├── settings/            # Pengaturan titik GPS & radius
│   │   │   ├── users/               # Manajemen akun (Super Admin)
│   │   │   ├── dashboard/           # Ringkasan analitik HRD
│   │   │   └── layout.tsx           # Sidebar & navigasi portal HRD
│   │   ├── intern/           # Halaman Antarmuka Portal Mahasiswa Magang
│   │   │   ├── attendance/          # Halaman absen GPS + Biometrik
│   │   │   ├── register-face/       # Pendaftaran wajah 3 sudut
│   │   │   ├── dashboard/           # Dashboard riwayat mahasiswa
│   │   │   └── layout.tsx           # Navigasi portal mahasiswa
│   │   ├── globals.css       # Style utility Tailwind & Glassmorphism
│   │   ├── layout.tsx        # Root HTML layout
│   │   └── page.tsx          # Halaman login utama
│   ├── components/
│   │   ├── face-capture.tsx  # Komponen kamera HUD, 3D liveness & capture
│   │   ├── geofence-checker.tsx # Komponen GPS radar & validasi radius
│   │   └── ui/               # Komponen tombol, kartu, dan input
│   ├── lib/
│   │   ├── auth.ts           # Manajemen token JWT & autentikasi server
│   │   ├── face-api.ts       # Loader model & deteksi wajah browser
│   │   ├── face-math.ts      # Logika perbandingan Euclidean & threshold
│   │   ├── haversine.ts      # Formula perhitungan jarak radius bumi
│   │   ├── permissions.ts    # Matriks izin edit & guard 5 role
│   │   ├── payout-calc.ts    # Formula hitung uang saku normal & perbantuan
│   │   ├── supabase.ts       # Inisialisasi Supabase client (Client & Admin)
│   │   └── utils.ts          # Format tanggal Indonesia & kalkulasi rentang
│   └── types/
│       └── index.ts          # Definisi interface TypeScript global
├── supabase/
│   ├── schema.sql            # Skema DDL lengkap basis data
│   └── migration_v2.sql      # Skrip migrasi 5 peran, batch 15, & audit
├── .env.local                # Kredensial lingkungan kerja
├── next.config.ts            # Konfigurasi Next.js
├── package.json              # Daftar pustaka & dependensi npm
└── tsconfig.json             # Konfigurasi compiler TypeScript
```

---

## 🔌 Daftar Endpoint API

### 1. Autentikasi (`/api/auth`)
- `POST /api/auth/login`: Menerima email dan password, memverifikasi hash bcrypt, menghasilkan HTTP-only cookie JWT.
- `POST /api/auth/logout`: Menghapus sesi dan cookie login.
- `GET /api/auth/me`: Mengembalikan informasi pengguna aktif yang sedang login.

### 2. Absensi Magang (`/api/attendance`)
- `POST /api/attendance/checkin`: Menerima koordinat lat/long, jarak meter, dan `face_descriptor` 128D. Memverifikasi lokasi dan biometrik sebelum mencatat jam masuk.
- `POST /api/attendance/checkout`: Menerima `face_descriptor`, memverifikasi biometrik, menghitung total durasi jam kerja, dan menentukan status (`full_day` $\ge 6$ jam atau `half_day` $< 6$ jam).
- `GET /api/attendance/my-history`: Mengambil riwayat absensi akun magang yang sedang login.

### 3. Pendaftaran Wajah (`/api/users`)
- `GET /api/users/me`: Mengambil profil dan status biometrik wajah pengguna.
- `POST /api/users/register-face`: Menyimpan array `face_descriptor` (128 float) ke dalam database (hanya bisa 1x kecuali di-reset Super Admin).

### 4. Portal HRD (`/api/hrd`)
- `GET /api/hrd/attendance-recap`: Mengambil struktur matriks kehadiran horizontal berdasarkan filter `batchId`, `startDate`, dan `endDate`, lengkap dengan daftar tanggal, nomor minggu, pembagian divisi, dan ringkasan kode.
- `PUT /api/hrd/attendance-recap`: Memperbarui kode kehadiran atau catatan rinci pada sel absensi tertentu dengan penegakan izin peran (*RBAC Policy*).
- `GET /api/hrd/batches`: Mengambil daftar seluruh gelombang magang (*batches*).
- `POST /api/hrd/batches`: Menambah atau memperbarui periode dan tarif batch magang.
- `GET /api/hrd/interns`: Mengambil daftar seluruh mahasiswa magang beserta status aktif/perbantuan.
- `GET /api/hrd/payout`: Mengambil komputasi uang saku magang berdasarkan kehadiran per mahasiswa.

### 5. Khusus Administrator (`/api/admin`)
- `GET /api/admin/users`: Mengambil daftar akun pengguna dengan filter pencarian dan role.
- `POST /api/admin/users`: Membuat akun pengguna baru (Super Admin, Kepala HRD, Staf HRD, Intern HRD, atau Intern).
- `PUT /api/admin/users`: Mengubah data pengguna, role jabatan, departemen, atau password.
- `DELETE /api/admin/users`: Menghapus akun pengguna dari sistem.
- `POST /api/admin/reset-face`: Mengosongkan data wajah mahasiswa magang sehingga yang bersangkutan dapat mendaftar ulang.
- `GET /api/admin/reset-attendance-today`: Melihat daftar absensi masuk hari ini.
- `POST /api/admin/reset-attendance-today`: Menghapus baris absensi hari ini agar anak magang dapat melakukan proses absensi ulang dari awal.

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
   Buat file `.env.local` di root folder proyek (lihat panduan [Konfigurasi Environment Variables](#-konfigurasi-environment-variables)).

4. **Jalankan Skrip Basis Data**:
   Buka **SQL Editor** pada Dashboard Supabase Anda, lalu eksekusi isi file:
   - `supabase/schema.sql` (untuk instalasi fresh basis data)
   - `supabase/migration_v2.sql` (untuk sinkronisasi 5 role, akun default, dan batch 15)

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

Contoh isi file `.env.local`:
```env
# ============================================================
# PT BPR Sehat Sejahtera - Konfigurasi Supabase
# ============================================================
NEXT_PUBLIC_SUPABASE_URL=https://rmirmixvuevlmsfifrjq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxx
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxx

# Secret Key (Server-Side Only - Jangan sebarkan ke publik)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxx

# Kunci Rahasia JWT Session Cookie
JWT_SECRET=bprss_intern_hrms_super_secure_jwt_secret_key_2026
```

---

## 📖 Panduan Penggunaan Fitur Kunci

### 1. Akun Bawaan Sistem (*Default Accounts*)
| Role | Email | Password Default |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@bprsehat.com` | `admin123` |
| **Kepala HRD** | `kepala.hrd@bprsehat.com` | `kepala123` |
| **Staf HRD** | `staf.hrd@bprsehat.com` | `staf123` |
| **Intern HRD (SDM)** | `alfiani@intern.bprsehat.com` | `intern123` |
| **Intern Biasa** | `budi@intern.bprsehat.com` | `intern123` |

### 2. Alur Absensi Mahasiswa Magang
1. Mahasiswa login menggunakan email magang.
2. Jika belum pernah mendaftarkan wajah, sistem otomatis mengarahkan ke halaman **/intern/register-face**.
3. Posisikan wajah di lingkaran kamera: ikuti panduan hadap lurus, tolehkan kepala sedikit untuk verifikasi keaktifan 3D, dan konfirmasi akhir.
4. Buka menu **/intern/attendance**:
   - Izinkan akses lokasi browser (*GPS Geolocation*).
   - Pastikan indikator radar GPS berwarna hijau (*Di dalam area kantor*).
   - Tatap kamera untuk verifikasi biometrik wajah. Dalam hitungan 2 detik, sistem akan mencocokkan embedding wajah dengan basis data.
   - Setelah sukses terverifikasi, jam masuk tercatat otomatis.
5. Saat jam pulang kerja tiba, buka kembali menu **/intern/attendance** dan lakukan pemindaian wajah untuk check-out. Durasi kerja akan dihitung otomatis.

### 3. Alur Pengelolaan Rekapitulasi oleh HRD
1. Staf/Kepala HRD atau Super Admin membuka **/hrd/attendance-recap**.
2. Secara default sistem menyajikan rentang 2 minggu (minggu ini s/d minggu depan) sesuai format horizontal BPR Sehat Sejahtera.
3. Klik pada sel tanggal anak magang bersangkutan:
   - Pilih kode kehadiran: **H** (Hadir Penuh), **1/2** (Setengah Hari), **I** (Izin), **S** (Sakit), atau **A** (Alpa).
   - Tuliskan alasan di kolom **Keterangan Rinci**.
   - Simpan status.
4. Klik tombol **Ekspor Excel (CSV)** untuk mengunduh laporan bulanan atau klik **Cetak / PDF** untuk mencetak rekapitulasi kehadiran resmi ke atas kertas landscape.

---

## 📄 Lisensi & Hak Cipta
Hak Cipta © 2026 **PT BPR Sehat Sejahtera**. Seluruh hak cipta dilindungi undang-undang. Sistem ini dikembangkan untuk kebutuhan operasional internal bank.
