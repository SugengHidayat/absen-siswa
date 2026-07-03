# 🎒 Aplikasi Absensi Murid Kelas 4 — SDN RANUKLINDUNGAN I

Sistem informasi pencatatan kehadiran (Absensi Mandiri) siswa-siswi Kelas 4 SDN Ranuklindungan I berbasis *Serverless Web Application*. Aplikasi ini berjalan menggunakan kombinasi **GitHub Pages** sebagai penyedia layanan antarmuka statis, **Google Apps Script (GAS)** sebagai mesin logika backend, serta **Google Sheets & Google Drive** sebagai pangkalan data utama.

## 🌟 Fitur Utama
1. **Pencarian Real-Time Ramah Anak:** Murid cukup mengetik nomor absen, identitas nama lengkap dan alamat langsung muncul otomatis secara *read-only* guna meminimalisir salah input.
2. **Kamera Web Terintegrasi (Anti-Cheat):** Validasi kehadiran melampirkan foto bukti fisik langsung yang diambil via kamera gawai/laptop murid secara instan.
3. **Tombol Kirim Dinamis:** Tombol kirim hanya akan menyala biru aktif apabila seluruh komponen (No Absen Valid + Keterangan Terpilih + Swafoto Selesai) telah terpenuhi.
4. **Dashboard Panel Admin (Pak Sugeng Hidayat):** Fasilitas pengaturan tahun ajaran aktif, tabel data database, dan pengunggahan massal data murid dari format Excel (.xlsx) tanpa hambatan memori.

---

## 🛠️ Panduan Instalasi & Penerapan (Deployment)

### Langkah 1: Siapkan Struktur Lembar Kerja Google Sheets
Buat berkas Google Spreadsheet baru, dan bagi menjadi 3 tab utama dengan struktur nama header kolom berikut pada baris pertama:
* **`Config_Admin`** -> `username` | `password` | `nama_admin` | `foto_profil_url` | `tahun_absen_aktif`
* **`Data_Murid`** -> `no_absen` | `nama_murid` | `alamat` | `foto_url` | `tahun_ajaran`
* **`Log_Absensi`** -> `timestamp` | `tahun_ajaran` | `no_absen` | `nama_murid` | `status` | `foto_bukti_url`

### Langkah 2: Pasang Kode Google Apps Script
1. Masuk ke Spreadsheet Anda -> Klik **Ekstensi** -> **Apps Script**.
2. Tempelkan seluruh kode logika backend router (`doPost`) ke dalam editor script.
3. Isikan kode variabel `SPREADSHEET_ID` dan `DRIVE_FOLDER_ID` sesuai dengan ID penyimpanan aset digital Google milik sekolah Anda.
4. Klik **Terapkan (Deploy)** -> **Penerapan Baru**.
5. Setel jenis eksekusi ke **Aplikasi Web (Web App)** dan konfigurasi izin akses ke **Siapa saja (Anyone)**.
6. Salin tautan URL Web App yang disediakan.

### Langkah 3: Konfigurasi di Repositori GitHub
1. Buat Repositori baru di akun GitHub Anda (bisa berupa *Public* maupun *Private*).
2. Unggah file `index.html` dan `admin.html`.
3. Pastikan konstanta variabel `API_URL` pada bagian tag script kedua file HTML tersebut telah terisi dengan URL Apps Script yang Anda salin pada Langkah 2.
4. Buka menu **Settings** -> **Pages** di halaman repositori GitHub Anda.
5. Setel Branch deployment ke arah `main` (atau `master`) lalu tekan **Save**.
6. Aplikasi absensi siap diakses publik di internet secara gratis!

---

## 🔒 Konfigurasi Akun Pengelola Sistem (Default)
Untuk kebutuhan pengelolaan administrasi awal, hak akses masuk akun administrator dikonfigurasi sebagai berikut:
* **Username Admin:** `Sugeng11`
* **Kata Sandi Admin:** `110477Sg`
* **Nama Akun Resmi:** Pak Sugeng Hidayat

---
*Dibuat dengan dedikasi tinggi demi kemudahan administrasi pembelajaran guru & anak didik SDN Ranuklindungan I.*
