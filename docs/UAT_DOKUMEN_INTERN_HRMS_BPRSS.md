# DOKUMEN USER ACCEPTANCE TESTING (UAT)
## SISTEM INFORMASI MANAJEMEN MAGANG & ABSENSI (INTERN HRMS)
### PT BPR SEHAT SEJAHTERA

---

## 1. INFORMASI DOKUMEN & PENGENDALIAN VERSI

| Atribut Dokumen | Rincian |
|---|---|
| **Judul Dokumen** | Dokumen Spesifikasi Kasus Uji Penerimaan Pengguna (User Acceptance Testing - UAT) |
| **Nomor Dokumen** | UAT-HRMS-BPRSS-2026-V1.0 |
| **Nama Proyek** | Intern HRMS (Human Resource Management System) PT BPR Sehat Sejahtera |
| **Tanggal Terbit** | 22 Oktober 2026 |
| **Versi Dokumen** | 1.0 (Final Pre-Release) |
| **Pemilik Proyek** | Divisi Sumber Daya Manusia (SDM) / HRD & Divisi Teknologi Informasi (IT) |
| **Entitas Perusahaan** | PT BPR Sehat Sejahtera |

### Riwayat Perubahan Dokumen
| Versi | Tanggal | Penulis | Deskripsi Perubahan |
|---|---|---|---|
| 0.1 | 15 Okt 2026 | Tim Pengembang | Draf awal skenario modul absensi & rekap |
| 0.5 | 20 Okt 2026 | Tim Pengembang | Pembaruan RBAC, Manajemen Divisi, Manajemen Role, dan Bulk Generator |
| 1.0 | 22 Okt 2026 | Tim Pengembang & QA | Dokumen lengkap menyeluruh siap eksekusi (Multi-tab session, validasi kredensial ketat, geofencing, face recognition) |

---

## 2. PENDAHULUAN

### 2.1 Latar Belakang
Sistem **Intern HRMS PT BPR Sehat Sejahtera** dikembangkan untuk mendigitalisasi dan mengotomatisasi seluruh siklus operasional program pemagangan, meliputi:
1. Pendaftaran dan penerbitan akun anak magang secara otomatis/kolektif (*bulk provisioning*).
2. Verifikasi kehadiran harian berbasis validasi biometrik wajah (*Face Recognition*) dan batasan radius lokasi kantor (*Geofencing GPS*).
3. Rekapitulasi absensi otomatis berstandar spreadsheet matriks bulanan per bagian.
4. Perhitungan uang saku akurat berdasarkan kehadiran aktual serta pembedaan tarif reguler vs masa perbantuan.
5. Manajemen perizinan bertingkat (*Role-Based Access Control*) dan hierarki divisi dinamis.

### 2.2 Tujuan UAT
1. Memverifikasi bahwa seluruh alur kerja sistem telah sesuai dengan kebutuhan operasional nyata Divisi HRD dan Anak Magang PT BPR Sehat Sejahtera.
2. Memastikan tidak ada celah keamanan atau anomali fungsional (misal: pemalsuan lokasi, kesalahan perhitungan uang saku, kegagalan sesi login di banyak tab).
3. Memperoleh persetujuan formal (*Sign-Off*) dari pemangku kepentingan (*stakeholder*) sebelum sistem dideklarasikan *Go-Live*.

### 2.3 Ruang Lingkup Pengujian (*Scope*)
* **Termasuk dalam Pengujian (*In-Scope*)**:
  * Modul Autentikasi & Manajemen Sesi (Login, Multi-tab session, Logout, Proteksi Rute).
  * Modul Aktivasi Akun Magang (Validasi ganti username & password bawaan).
  * Modul Registrasi Wajah & Presensi Biometrik (*Check-in* & *Check-out*).
  * Modul Geofencing (Radius koordinat kantor BPR Sehat Sejahtera).
  * Modul Rekap Absensi Matriks Bulanan & Riwayat Absensi.
  * Modul Rekapitulasi & Kalkulasi Uang Saku (Reguler & Masa Perbantuan).
  * Modul Master Data Admin (Manajemen Akun, Bulk Create, Manajemen Divisi, Manajemen Role, Pengaturan Lokasi).
* **Di Luar Pengujian (*Out-of-Scope*)**:
  * Pengujian penetrasi keamanan tingkat lanjut (*Penetration Testing* eksternal).
  * Pengujian kapasitas beban server lebih dari 10.000 permintaan konkuren secara bersamaan (*Stress Testing* masif).

### 2.4 Glosarium & Definisi Istilah
* **HRMS**: *Human Resource Management System*.
* **RBAC**: *Role-Based Access Control* (Hak akses berdasarkan peran pengguna).
* **Super Admin**: Peran administrator dengan hak akses penuh ke seluruh modul sistem dan konfigurasi master data.
* **Kepala HRD / Staf HRD**: Peran fungsional HRD yang mengelola pemantauan magang, rekap presensi, dan uang saku.
* **Intern**: Anak magang aktif yang menggunakan sistem untuk presensi harian.
* **Geofencing**: Pembatasan wilayah geografis absensi menggunakan koordinat GPS (Latitude/Longitude) dan toleransi radius (meter).
* **Face Descriptor**: Representasi data vektor 128-dimensi dari fitur unik wajah pengguna hasil komputasi model AI.
* **Masa Perbantuan**: Periode perpanjangan magang setelah masa normal (6 bulan) selesai dengan skema uang saku khusus.

---

## 3. KRITERIA PENGUJIAN & METODE

### 3.1 Kriteria Masuk (*Entry Criteria*)
UAT dapat dimulai apabila:
1. Seluruh kode program telah di-deploy ke lingkungan staging/produksi stabil (Vercel) dan terhubung ke basis data Supabase aktif.
2. Proses kompilasi (*build*) berstatus 0 error dan lolos uji integrasi internal.
3. Master data batch aktif dan data lokasi kantor BPR Sehat Sejahtera telah terkonfigurasi.
4. Perangkat uji (smartphone dan laptop penguji) telah siap dengan koneksi internet aktif.

### 3.2 Kriteria Kelulusan (*Exit / Acceptance Criteria*)
Sistem dinyatakan lulus UAT jika:
1. **100% kasus uji berkategori *Critical*** berstatus **PASS** (Lolos).
2. **Minimal 95% dari seluruh total kasus uji** berstatus **PASS** (Lolos).
3. Tidak ada cacat/temuan (*defect*) berstatus *Critical* atau *High* yang belum terselesaikan.
4. Form Persetujuan Akhir (*Sign-Off Sheet*) telah ditandatangani oleh seluruh perwakilan pihak terkait.

### 3.3 Klasifikasi Tingkat Keparahan Temuan (*Defect Severity*)
* **Critical**: Sistem lumpuh, data hilang/rusak, pengguna tidak bisa login, atau absensi tidak bisa tersimpan sama sekali.
* **High**: Alur bisnis utama terhambat tanpa solusi sementara (misal: uang saku salah hitung, geofencing salah validasi).
* **Medium**: Masalah fungsional non-kritis yang memiliki solusi sementara (*workaround*), atau kesalahan validasi minor.
* **Low**: Masalah kosmetik tampilan, salah ketik label, atau ketidaksejajaran visual minor.

---

## 4. LINGKUNGAN PENGUJIAN & DATA UJI

### 4.1 Spesifikasi Lingkungan
* **URL Aplikasi Uji**: `https://intern-hrms-bprss.vercel.app` (atau environment staging yang disepakati)
* **Basis Data**: Cloud PostgreSQL (Supabase)
* **Koneksi Internet**: Seluler 4G/5G atau Wi-Fi Kantor

### 4.2 Spesifikasi Perangkat Penguji
| Tipe Perangkat | Sistem Operasi | Peramban (Browser) | Perangkat Keras Wajib |
|---|---|---|---|
| **Smartphone Android** | Android 10 atau lebih baru | Google Chrome Versi Terbaru | Kamera depan, GPS Aktif |
| **Smartphone iOS** | iOS 15 atau lebih baru | Safari / Chrome iOS | Kamera depan, GPS Aktif |
| **PC / Laptop HRD** | Windows 10/11 atau macOS | Chrome / Edge / Firefox | Resolusi layar min. 1366 x 768 |

### 4.3 Akun Pengguna Uji (*Test User Accounts*)
| Role / Peran | Username Uji | Password Default / Uji | Tujuan Pengujian |
|---|---|---|---|
| **Super Admin** | `superadmin` | *Password Admin* | Pengujian hak akses administrator penuh |
| **Kepala HRD** | `kepala.hrd` | *Password HRD* | Pengujian pemantauan rekap & uang saku |
| **Intern (Baru/Default)** | `valdis.sandya` | `magang2026` | Pengujian aktivasi akun pertama kali & validasi ganti kredensial |
| **Intern (Aktif)** | `budi.santoso` | *Password Baru* | Pengujian presensi harian, wajah, dan riwayat |

---

## 5. MATRIKS KASUS UJI UAT (TEST CASES SPECIFICATION)

### MODUL 1: AUTENTIKASI, MULTI-TAB SESSION & OTORISASI RBAC

| ID Kasus Uji | Skenario Pengujian | Langkah Pengujian | Hasil yang Diharapkan | Prioritas | Status |
|---|---|---|---|---|---|
| **TC-AUTH-01** | Login Berhasil Akun HRD / Admin | 1. Buka halaman `/`<br>2. Masukkan username `superadmin`<br>3. Masukkan password valid<br>4. Klik tombol "Masuk" | Pengguna berhasil diautentikasi dan langsung diarahkan ke `/hrd/dashboard`. Cookie sesi `hrms_session` tersimpan. | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-AUTH-02** | Login Berhasil Akun Intern | 1. Buka halaman `/`<br>2. Masukkan username intern valid<br>3. Masukkan password valid<br>4. Klik tombol "Masuk" | Pengguna berhasil diautentikasi dan langsung diarahkan ke `/intern/dashboard`. | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-AUTH-03** | Penolakan Kredensial Salah | 1. Buka halaman `/`<br>2. Masukkan username `budi.santoso`<br>3. Masukkan password sembarang/salah<br>4. Klik tombol "Masuk" | Sistem menampilkan pesan kesalahan "Username atau password salah." Pengguna tetap di halaman login. | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-AUTH-04** | Persistensi Sesi di Tab Baru (Multi-Tab Auto Redirect) | 1. Pada Tab 1 browser, login sebagai Super Admin hingga masuk dashboard.<br>2. Buka Tab 2 baru pada browser yang sama.<br>3. Ketikkan URL root aplikasi `https://.../`<br>4. Tekan Enter. | Halaman root `/` mendeteksi sesi aktif dan langsung me-redirect browser ke `/hrd/dashboard` tanpa menampilkan halaman login. | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-AUTH-05** | Proteksi Rute Terlarang (*Unauthorized Role Access*) | 1. Login sebagai akun role `intern`.<br>2. Pada address bar peramban, coba ketik langsung URL `/hrd/dashboard` atau `/hrd/users`.<br>3. Tekan Enter. | Sistem menolak akses dan secara otomatis melempar (*redirect*) pengguna kembali ke `/intern/dashboard`. | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-AUTH-06** | Logout Pengguna | 1. Pada dashboard (HRD atau Intern), klik tombol ikon "Logout". | Sesi dibersihkan dari server & browser, cookie dihapus, dan pengguna dikembalikan ke halaman login `/`. | High | [ ] PASS<br>[ ] FAIL |

---

### MODUL 2: AKTIVASI AKUN INTERN DEFAULT (FIRST-TIME LOGIN)

| ID Kasus Uji | Skenario Pengujian | Langkah Pengujian | Hasil yang Diharapkan | Prioritas | Status |
|---|---|---|---|---|---|
| **TC-ACT-01** | Tampilan Modal Wajib Aktivasi Akun | 1. Login menggunakan akun magang baru dengan kredensial default (`valdis.sandya` / `magang2026`).<br>2. Masuk ke dashboard intern. | Muncul modal popup "Aktivasi Akun Magang" berlabel "WAJIB" yang memblokir akses ke fitur lain hingga kredensial diperbarui. Badge username bawaan ditampilkan. | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-ACT-02** | Penolakan Jika Username Tidak Diubah (Masih Bawaan) | 1. Pada modal aktivasi, biarkan atau ketik username yang persis sama dengan username bawaan saat ini (`valdis.sandya`).<br>2. Masukkan password baru unik & konfirmasi cocok.<br>3. Klik "Simpan & Lanjutkan". | Sistem menolak dengan pesan error: "Username baru tidak boleh sama dengan username bawaan...". Data tidak tersimpan. | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-ACT-03** | Penolakan Password Default (`magang2026`) | 1. Masukkan username baru yang valid.<br>2. Pada field Password Baru, masukkan `magang2026`.<br>3. Konfirmasi password `magang2026`.<br>4. Klik "Simpan & Lanjutkan". | Sistem menolak dengan pesan error: "Password baru tidak boleh menggunakan password default (magang2026)...". | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-ACT-04** | Penolakan Username dan Password Sama Persis | 1. Masukkan username baru: `valdis_baru`.<br>2. Masukkan password baru: `valdis_baru`.<br>3. Konfirmasi password: `valdis_baru`.<br>4. Klik "Simpan & Lanjutkan". | Sistem menolak dengan pesan: "Username dan password tidak boleh sama demi alasan keamanan akun." | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-ACT-05** | Penolakan Duplikasi Username | 1. Masukkan username baru yang sudah dimiliki pengguna lain (misal: `superadmin` atau `budi.santoso`).<br>2. Masukkan password baru aman.<br>3. Klik "Simpan & Lanjutkan". | Sistem menolak dengan pesan error: "Username sudah terpakai oleh pengguna lain, silakan gunakan username yang berbeda." | High | [ ] PASS<br>[ ] FAIL |
| **TC-ACT-06** | Penyimpanan Sukses Kredensial Baru | 1. Masukkan username baru yang unik (contoh: `valdis.akbar`).<br>2. Masukkan password baru yang kuat minimal 6 karakter (contoh: `BprSehat#2026`).<br>3. Masukkan konfirmasi password yang cocok.<br>4. Klik "Simpan & Lanjutkan". | Tampil notifikasi sukses "Kredensial Berhasil Diperbarui!". Halaman memuat ulang, modal hilang, flag `must_change_credentials` menjadi `false`, dan sesi baru langsung aktif. | Critical | [ ] PASS<br>[ ] FAIL |

---

### MODUL 3: PENDAFTARAN WAJAH & PRESENSI BIOMETRIK (INTERN PORTAL)

| ID Kasus Uji | Skenario Pengujian | Langkah Pengujian | Hasil yang Diharapkan | Prioritas | Status |
|---|---|---|---|---|---|
| **TC-FACE-01** | Registrasi Sampel Wajah Baru | 1. Buka menu "Data Wajah" (`/intern/register-face`).<br>2. Berikan izin akses kamera perangkat.<br>3. Posisikan wajah di dalam bingkai panduan.<br>4. Klik "Ambil Foto Wajah & Daftarkan". | Model AI mendeteksi wajah tunggal, mengekstraksi vektor 128-dimensi, menyimpannya ke database, dan menampilkan status "Wajah Anda Sudah Terdaftar". | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-FACE-02** | Penolakan Foto Wajah Tidak Valid | 1. Buka halaman registrasi wajah.<br>2. Arahkan kamera ke dinding kosong (tanpa wajah) atau tutupi kamera.<br>3. Klik ambil foto. | Sistem menampilkan peringatan "Wajah tidak terdeteksi. Pastikan wajah terlihat jelas dan pencahayaan cukup." Data tidak tersimpan. | High | [ ] PASS<br>[ ] FAIL |
| **TC-ATT-01** | Check-in Berhasil (Wajah Cocok & Dalam Radius) | 1. Buka menu "Absen Harian" (`/intern/attendance`) pada jam kerja pagi.<br>2. Pastikan GPS aktif dan berada di dalam radius kantor BPR (misal jarak 15m < 50m).<br>3. Hadapkan wajah terdaftar ke kamera.<br>4. Klik tombol "Check-in Masuk". | Sistem memverifikasi kecocokan wajah (similarity score tinggi) dan koordinat GPS. Presensi berhasil dicatat dengan status "Tepat Waktu" (atau "Terlambat"), waktu check-in tampil. | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-ATT-02** | Penolakan Check-in di Luar Radius Kantor (Geofencing) | 1. Berada di lokasi luar kantor (> radius toleransi yang ditentukan, misal 500 meter).<br>2. Coba lakukan "Check-in Masuk". | Sistem menolak absensi dengan pesan peringatan: "Anda berada di luar radius kantor ([jarak] meter dari lokasi kantor). Absensi ditolak." | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-ATT-03** | Penolakan Check-in Jika Wajah Tidak Cocok | 1. Akun A login di smartphone.<br>2. Saat scan check-in, hadapkan wajah orang lain B (bukan pemilik akun).<br>3. Klik "Check-in Masuk". | Sistem menolak presensi dengan pesan error kecocokan wajah: "Verifikasi wajah gagal. Wajah tidak cocok dengan data pendaftaran." | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-ATT-04** | Pencegahan *Double Check-in* | 1. Setelah berhasil check-in hari ini, coba lakukan klik check-in kembali. | Tombol Check-in dinonaktifkan / sistem menampilkan info bahwa pengguna sudah melakukan check-in hari ini. | High | [ ] PASS<br>[ ] FAIL |
| **TC-ATT-05** | Check-out Pulang Berhasil | 1. Pada sore hari, buka kembali menu "Absen Harian".<br>2. Posisikan wajah dan pastikan dalam radius kantor.<br>3. Klik tombol "Check-out Pulang". | Waktu pulang tercatat dengan sukses. Status kartu absensi hari ini berubah menjadi lengkap (Check-in & Check-out terisi). | High | [ ] PASS<br>[ ] FAIL |
| **TC-ATT-06** | Penolakan Check-out Tanpa Check-in | 1. Gunakan akun yang belum pernah check-in pada hari berjalan.<br>2. Coba eksekusi aksi check-out. | Sistem menampilkan pesan error bahwa pengguna belum melakukan absensi masuk hari ini. | High | [ ] PASS<br>[ ] FAIL |
| **TC-ATT-07** | Riwayat Presensi Pribadi | 1. Buka dashboard intern.<br>2. Periksa tabel riwayat absensi. | Menampilkan catatan tanggal, jam masuk, jam pulang, dan status kehadiran dalam format tanggal Indonesia `hh/bb/tttt` secara urut. | Medium | [ ] PASS<br>[ ] FAIL |

---

### MODUL 4: MANAJEMEN ABSENSI & REKAPITULASI (HRD PORTAL)

| ID Kasus Uji | Skenario Pengujian | Langkah Pengujian | Hasil yang Diharapkan | Prioritas | Status |
|---|---|---|---|---|---|
| **TC-REKAP-01** | Tampilan Dashboard HRD Realtime | 1. Login sebagai HRD.<br>2. Buka `/hrd/dashboard`. | Menampilkan kartu metrik: Total Intern terdaftar, Total Hadir Hari Ini, Total Masa Perbantuan, dan Identitas Batch Aktif. | High | [ ] PASS<br>[ ] FAIL |
| **TC-REKAP-02** | Rekap Absensi Matriks Spreadsheet | 1. Buka menu "Rekap Absensi" (`/hrd/attendance-recap`).<br>2. Pilih filter Bulan & Tahun berjalan.<br>3. Pilih Bagian/Divisi. | Tampil tabel matriks absensi resmi sesuai standar: kolom tanggal 1 s/d 31, kolom hari Sabtu & Minggu (weekend) bertanda khusus warna kuning, kode kehadiran (H, T, I, S, A, 1/2), dan total ringkasan di kolom akhir. | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-REKAP-03** | Riwayat Absensi Lengkap | 1. Buka menu "Riwayat Absensi" (`/hrd/attendance-history`).<br>2. Terapkan filter berdasarkan tanggal atau nama anak magang. | Tabel menampilkan rincian log presensi lengkap: Nama, Divisi, Waktu Check-in, Waktu Check-out, Koordinat Lokasi, dan Status. | Medium | [ ] PASS<br>[ ] FAIL |
| **TC-REKAP-04** | Tombol Reset Absensi Hari Ini (Fitur Uji/Admin) | 1. Pada menu absensi/pengaturan, gunakan fitur reset absensi hari ini untuk anak magang uji coba. | Catatan absensi hari ini ter-reset kembali kosong, sehingga penguji dapat melakukan simulasi check-in ulang tanpa menunggu esok hari. | High | [ ] PASS<br>[ ] FAIL |

---

### MODUL 5: MANAJEMEN DATA ANAK MAGANG & BATCH

| ID Kasus Uji | Skenario Pengujian | Langkah Pengujian | Hasil yang Diharapkan | Prioritas | Status |
|---|---|---|---|---|---|
| **TC-MAG-01** | Tampilan Daftar Anak Magang | 1. Buka menu "Data Anak Magang" (`/hrd/interns`). | Menampilkan seluruh anak magang terdaftar lengkap dengan status magang, penempatan divisi, batch, dan status wajah (Terdaftar/Belum). | High | [ ] PASS<br>[ ] FAIL |
| **TC-MAG-02** | Toggle Status Masa Perbantuan | 1. Pada tabel Data Anak Magang, cari anak magang yang telah menyelesaikan masa normal.<br>2. Aktifkan toggle "Masa Perbantuan". | Status berubah menjadi "Masa Perbantuan". Perhitungan uang saku anak magang ini secara otomatis beralih menggunakan tarif khusus perbantuan. | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-BATCH-01** | Pembuatan & Pengaturan Batch Magang | 1. Buka menu "Manajemen Batch" (`/hrd/batches`).<br>2. Buat batch baru (misal Batch 16) dengan rentang tanggal mulai dan selesai.<br>3. Jadikan sebagai batch aktif. | Batch baru tersimpan dan berstatus aktif. Tanda batch aktif di header dashboard berubah sesuai batch terpilih. | High | [ ] PASS<br>[ ] FAIL |

---

### MODUL 6: ADMINISTRATOR MASTER DATA (SUPER ADMIN)

| ID Kasus Uji | Skenario Pengujian | Langkah Pengujian | Hasil yang Diharapkan | Prioritas | Status |
|---|---|---|---|---|---|
| **TC-ADM-01** | Pembuatan Akun Massal (*Bulk Create Interns*) | 1. Buka menu "Manajemen Akun" (`/hrd/users`).<br>2. Klik tombol "Tambah Akun Massal (Bulk)".<br>3. Pilih divisi dari dropdown (contoh: "CS").<br>4. Masukkan nama-nama anak magang (satu nama per baris).<br>5. Klik "Simpan & Buat Akun". | Sistem otomatis men-generate akun untuk setiap nama: username huruf kecil tanpa spasi, password default `magang2026`, role otomatis `intern`, batch otomatis ke batch aktif, status aktif, dan flag ganti password bernilai true. | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-ADM-02** | Manajemen Divisi / Bagian Dinamis | 1. Buka menu "Manajemen Divisi" (`/hrd/departments`).<br>2. Tambah divisi baru (contoh: "Operasional Kas", Kode: "OPS").<br>3. Simpan data.<br>4. Buka kembali form pembuatan akun massal atau dropdown filter absensi. | Divisi baru muncul di daftar tabel divisi dan langsung tersedia secara dinamis pada semua dropdown pilihan divisi di seluruh aplikasi tanpa hardcode. | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-ADM-03** | Manajemen Role & Hak Akses | 1. Buka menu "Manajemen Role" (`/hrd/roles`).<br>2. Periksa matriks hak akses untuk `super_admin`, `kepala_hrd`, `staf_hrd`, `intern_hrd`, dan `intern`. | Matriks perizinan modul (lihat, tambah, edit, hapus, rekap) ditampilkan jelas dan mencerminkan batasan akses riil tiap peran. | High | [ ] PASS<br>[ ] FAIL |
| **TC-ADM-04** | Pengaturan Lokasi & Radius Geofencing | 1. Buka menu "Pengaturan Lokasi" (`/hrd/settings`).<br>2. Perbarui titik koordinat kantor (Latitude, Longitude) dan batas radius toleransi (contoh: 50 meter).<br>3. Simpan perubahan. | Pengaturan berhasil diperbarui. Validasi absensi pada modul intern langsung mengadopsi titik koordinat dan jarak radius baru tersebut. | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-ADM-05** | Reset Data Wajah Pengguna | 1. Di menu Manajemen Akun atau Data Anak Magang, pilih seorang anak magang yang ingin foto wajahnya diulang.<br>2. Klik tombol "Reset Wajah". | Data vektor wajah anak magang tersebut dihapus. Saat anak magang login, sistem memintanya melakukan pendaftaran foto wajah kembali. | High | [ ] PASS<br>[ ] FAIL |

---

### MODUL 7: KEUANGAN & REKAPITULASI UANG SAKU

| ID Kasus Uji | Skenario Pengujian | Langkah Pengujian | Hasil yang Diharapkan | Prioritas | Status |
|---|---|---|---|---|---|
| **TC-FIN-01** | Rentang Default 1 Bulan Berjalan | 1. Buka menu "Rekap Uang Saku" (`/hrd/payout`).<br>2. Periksa picker tanggal yang tampil default saat halaman pertama kali dimuat. | Filter tanggal secara otomatis terisi rentang 1 bulan penuh berdasarkan tanggal hari ini (contoh: 01/10/2026 s/d 31/10/2026). Tombol kalender bulan tampil tunggal dan rapi. | High | [ ] PASS<br>[ ] FAIL |
| **TC-FIN-02** | Akurasi Perhitungan Uang Saku Reguler | 1. Periksa baris anak magang reguler yang memiliki riwayat 20 hari kehadiran.<br>2. Verifikasi perkalian dengan tarif harian reguler. | Nilai total uang saku terhitung tepat: `Total Hadir x Tarif Reguler`, berformat Rupiah (`Rp xxx.xxx`), dan tanggal berformat Indonesia (`hh/bb/tttt`). | Critical | [ ] PASS<br>[ ] FAIL |
| **TC-FIN-03** | Akurasi Perhitungan Uang Saku Masa Perbantuan | 1. Periksa anak magang yang berstatus "Masa Perbantuan".<br>2. Verifikasi perhitungan uang saku. | Sistem secara otomatis mengalikan jumlah kehadiran dengan tarif khusus masa perbantuan yang telah ditetapkan di pengaturan batch. | Critical | [ ] PASS<br>[ ] FAIL |

---

## 6. LEMBAR PENCATATAN TEMUAN / CACAT (*DEFECT LOG*)

Gunakan tabel ini untuk mencatat setiap kendala, kegagalan uji (*FAIL*), atau temuan anomali selama eksekusi UAT berlangsung:

| No | ID Kasus Uji | Deskripsi Masalah / Temuan | Bukti / Screenshot | Tingkat Keparahan (Critical/High/Med/Low) | Penguji | Status Perbaikan (Open/Fixed/Verified) |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |

---

## 7. KRITERIA KEPUTUSAN & PERSETUJUAN AKHIR (*UAT SIGN-OFF*)

### 7.1 Hasil Rekapitulasi Pengujian
* Total Kasus Uji : **28 Kasus Uji**
* Jumlah Kasus Uji Lolos (*PASS*) : _____
* Jumlah Kasus Uji Gagal (*FAIL*) : _____
* Persentase Kelulusan : _____%

### 7.2 Pernyataan Penerimaan
Berdasarkan hasil pengujian penerimaan pengguna (*User Acceptance Testing*) yang telah dilaksanakan, pihak pemangku kepentingan (*stakeholders*) menyatakan bahwa aplikasi **Intern HRMS PT BPR Sehat Sejahtera**:

* [ ] **DITERIMA PENUH (GO-LIVE)**: Sistem memenuhi seluruh persyaratan bisnis dan siap dideploy ke lingkungan operasional resmi.
* [ ] **DITERIMA DENGAN CATATAN**: Sistem dapat digunakan dengan perbaikan pada catatan temuan tingkat Medium/Low sebelum tanggal yang disepakati.
* [ ] **DITOLAK**: Sistem memerlukan perbaikan menyeluruh pada temuan tingkat Critical/High sebelum dilakukan UAT ulang.

---

### 7.3 Pengesahan Pemangku Kepentingan (*Signatures*)

Dibuat dan disetujui pada tanggal: ____________________ 2026

| Perwakilan Divisi SDM / HRD | Perwakilan Divisi Teknologi Informasi (IT) |
| :---: | :---: |
| <br><br><br><br> | <br><br><br><br> |
| **(____________________________)**<br>Kepala Bagian SDM / HRD | **(____________________________)**<br>IT Lead / Super Admin |

<br>

| Perwakilan Pengembang Sistem | Perwakilan Pengguna Anak Magang |
| :---: | :---: |
| <br><br><br><br> | <br><br><br><br> |
| **(____________________________)**<br>Lead Software Engineer | **(____________________________)**<br>Perwakilan Intern |
