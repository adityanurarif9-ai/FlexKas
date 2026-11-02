# FlexKas — aplikasi kas tim Flexbox

Tampilan responsif: HP memakai satu kolom dan navigasi bawah seperti SakuPintar; tablet memakai ruang lebih lebar; desktop mulai 1000px memakai sidebar, ringkasan tiga kolom, grafik arus kas, panel iuran, dan tabel transaksi.

## Menjalankan di Visual Studio Code

1. Buka folder `D:\apk_kas_flexbox`.
2. Buka terminal, jalankan `npm install` sekali.
3. Jalankan `npm run dev`.
4. Buka alamat lokal yang ditampilkan.

## Fitur

- Beranda, transaksi, iuran, laporan, dan anggota.
- Tambah/edit/hapus transaksi; pemeriksaan saldo sebelum pengeluaran.
- Pembayaran iuran otomatis masuk ke buku kas dan status anggota.
- Filter bulan, pencarian, laporan arus kas/kategori, ekspor CSV dan cetak.
- Cadangan JSON melalui panel informasi tim.
- Logo SVG dompet, uang rupiah, dan aksen koin emas, dengan simbol Flexbox asli tetap di bagian depan. Ikon PNG 180/192/512px dibuat dari SVG untuk iPhone dan Android.
- PWA dengan manifest, petunjuk pemasangan Android/iPhone, dan shell offline pada build produksi.

## Build dan Vercel

Jalankan `npm run build`. Hasilnya ada di `dist/`. Untuk memeriksa hasil build, jalankan `npm run preview`.

Impor repo `adityanurarif9-ai/FlexKas` ke Vercel. Framework: Vite; build: `npm run build`; output: `dist`. Konfigurasi sudah tersedia di `vercel.json`. PWA memerlukan HTTPS atau localhost.

## Batas versi ini

Ini aplikasi frontend JavaScript dengan Vite. Data masih di localStorage perangkat, belum memakai akun atau database tim. Peran anggota adalah keterangan, bukan izin akses. Data awal berisi Adit (Leader), Rainer (Wakil Leader), Kiandra dan Bima (Anggota), serta Fakhri (Bendahara), dengan saldo nol. Riwayat keuangan harus diimpor dari Excel pada setiap browser/perangkat. Ekspor sebelum membersihkan data browser. Cadangan JSON untuk arsip; impor belum tersedia. Target iuran global berlaku untuk seluruh periode.

Pemasangan PWA tidak membuat file APK. Untuk dipakai bersama secara nyata, tahap berikutnya adalah akun pengguna, otorisasi bendahara/admin, dan database dengan pembatasan akses per tim.

## Susunan proyek

- `src/main.js`: halaman dan alur pencatatan kas.
- `src/styles.css`: tata letak HP, tablet, dan desktop.
- `public/assets/`: logo FlexKas dan logo Flexbox asli.
- `public/manifest.webmanifest`: identitas aplikasi di layar utama.
- `scripts/build-icons.mjs`: membuat ikon PNG dari logo SVG; jalankan `npm run icons` jika mengubah logo.
- `scripts/build-sw.mjs`: membuat shell offline; logo dan manifest dicari dari jaringan terlebih dahulu agar pembaruan tidak tertahan cache. Pada mode development, cache service worker FlexKas lama dilepas.

Proyek ini terpisah dari SakuPintar dan pratinjau Sites sebelumnya. Repository tujuan: https://github.com/adityanurarif9-ai/FlexKas.git

## Impor Excel kas mingguan

Buka **Impor Excel** di beranda atau panel tim, pilih workbook dengan tab **Kas Tim** dan **Catatan Pembayaran**, lalu periksa pratinjau sebelum menekan **Gunakan data Excel ini**. File dibaca di browser, tidak diunggah ke server atau disertakan ke GitHub.

Importer mendukung susunan workbook yang diberikan: lima anggota pada Kas Tim!B11:B15, nominal iuran di D7, saldo awal di G7, jadwal mingguan 2026 (baris 27–36) dan 2027 (baris 49–101), serta catatan pembayaran baris 8–807. Jika susunan berubah, importer menolak dengan keterangan, tanpa menyimpan sebagian data.

Status iuran memakai **tahun + nomor minggu** dari transaksi, bukan tanggal pembayaran. Bayar di muka, cicilan, dan lebih bayar tetap pada minggu yang dipilih. Nomor minggu mengikuti jadwal Excel dan dimulai ulang setiap tahun. Lebih bayar tidak otomatis dialokasikan ke minggu lain. Tanggal transaksi asli tetap dipakai untuk laporan arus kas bulanan. Ringkasan impor divalidasi terhadap total pemasukan, pengeluaran, saldo, dan setoran per anggota di Excel.

Impor mengganti dataset di perangkat, bukan menambahkan duplikat. Cadangan data sebelum impor disimpan lokal dan dapat dipulihkan melalui panel impor. Data kas lain yang ingin disimpan sebaiknya diunduh sebagai cadangan sebelum impor. Di perangkat lain, lakukan impor file sendiri; belum ada sinkronisasi tim.

Development dan preview memakai alamat tetap **http://127.0.0.1:5194/** agar data lokal tetap terlihat saat berpindah antara keduanya. Jalankan satu server saja. `npm test` menguji alokasi mingguan, cicilan, tahun pergantian, dan penolakan data tidak lengkap/tidak cocok.
