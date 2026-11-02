# FlexKas — aplikasi kas tim Flexbox

Tampilan aplikasi mobile seperti SakuPintar: satu kolom, logo FlexKas, kartu saldo, tombol pemasukan/pengeluaran, dan navigasi bawah. Saat dibuka lewat laptop, aplikasi tetap memakai lebar mobile maksimal 480px.

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
- Logo SVG FlexKas berdasarkan logo Flexbox yang diberikan pemilik.
- PWA dengan manifest, petunjuk pemasangan Android/iPhone, dan shell offline pada build produksi.

## Build dan Vercel

Jalankan `npm run build`. Hasilnya ada di `dist/`. Untuk memeriksa hasil build, jalankan `npm run preview`.

Impor repo `adityanurarif9-ai/FlexKas` ke Vercel. Framework: Vite; build: `npm run build`; output: `dist`. Konfigurasi sudah tersedia di `vercel.json`. PWA memerlukan HTTPS atau localhost.

## Batas versi ini

Ini aplikasi frontend JavaScript dengan Vite. Data masih di localStorage perangkat, belum memakai akun atau database tim. Peran anggota adalah keterangan, bukan izin akses. Data awal adalah contoh dan dapat dikosongkan melalui tombol Mulai kas. Ekspor sebelum membersihkan data browser. Cadangan JSON untuk arsip; impor belum tersedia. Target iuran global berlaku untuk seluruh periode.

Pemasangan PWA tidak membuat file APK. Untuk dipakai bersama secara nyata, tahap berikutnya adalah akun pengguna, otorisasi bendahara/admin, dan database dengan pembatasan akses per tim.

## Susunan proyek

- `src/main.js`: halaman dan alur pencatatan kas.
- `src/styles.css`: tampilan mobile untuk seluruh ukuran layar.
- `public/assets/`: logo FlexKas dan logo Flexbox asli.
- `public/manifest.webmanifest`: identitas aplikasi di layar utama.
- `scripts/build-sw.mjs`: membuat cache shell offline setelah build.

Proyek ini terpisah dari SakuPintar dan pratinjau Sites sebelumnya. Repository tujuan: https://github.com/adityanurarif9-ai/FlexKas.git
