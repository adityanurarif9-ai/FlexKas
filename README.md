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
- Pemeriksaan arsip lokal lama dan pengaturan akun melalui panel akun.
- Logo SVG dompet, uang rupiah, dan aksen koin emas, dengan simbol Flexbox asli tetap di bagian depan. Ikon PNG 180/192/512px dibuat dari SVG untuk iPhone dan Android.
- PWA dengan manifest, petunjuk pemasangan Android/iPhone, dan shell offline pada build produksi.

## Build dan Vercel

Jalankan `npm run build`. Hasilnya ada di `dist/`. Untuk memeriksa hasil build, jalankan `npm run preview`.

Impor repo `adityanurarif9-ai/FlexKas` ke Vercel. Framework: Vite; build: `npm run build`; output: `dist`. Konfigurasi sudah tersedia di `vercel.json`. PWA memerlukan HTTPS atau localhost.

## Akun tim dan kas bersama

**Konfigurasi Supabase FlexKas diperlukan sebelum login dapat digunakan.** Ikuti [panduan akun dan notifikasi](./PANDUAN-AKUN-NOTIFIKASI.md). Fakhri merupakan satu-satunya admin; Adit, Rainer, Kiandra, dan Bima hanya melihat kas. Hak akses diperiksa di database, bukan hanya tombol UI. Lima alamat `@flexboxstudio.site` dipakai sebagai nama login tanpa pengiriman email verifikasi.

Data kas disimpan pada satu database bersama. Server menolak perubahan dari akun penonton dan penyimpanan dengan versi lama. Tidak ada riwayat keuangan asli atau password bawaan di repository. Saldo dimulai nol; Fakhri meninjau lalu mengimpor Excel sekali untuk seluruh tim. Arsip localStorage versi lama tetap di perangkat dan hanya dapat dimuat setelah Fakhri login serta meninjaunya.

Pengingat menggunakan Web Push dengan izin pada setiap HP. Kode API, jadwal harian Vercel, VAPID, dan pendaftaran perangkat sudah tersedia; perlu konfigurasi server untuk mengaktifkannya. Anggota yang lunas dan Fakhri tidak menerima pengingat tunggakan. Suara khusus hanya saat aplikasi terbuka; suara latar belakang mengikuti pengaturan HP. Akun dapat mengganti password sendiri; pemulihan dilakukan owner karena alamat login tidak memiliki kotak email.

PWA menyimpan shell aplikasi untuk dibuka kembali, tetapi kas tidak dapat dimuat atau diubah tanpa internet dan sesi akun yang sah. Tidak ada file APK.

## Susunan proyek

- `src/main.js`: halaman dan alur pencatatan kas.
- `src/styles.css`: tata letak HP, tablet, dan desktop.
- `public/assets/`: logo FlexKas dan logo Flexbox asli.
- `public/manifest.webmanifest`: identitas aplikasi di layar utama.
- `scripts/build-icons.mjs`: membuat ikon PNG dari logo SVG; jalankan `npm run icons` jika mengubah logo.
- `scripts/build-sw.mjs`: membuat shell offline; logo dan manifest dicari dari jaringan terlebih dahulu agar pembaruan tidak tertahan cache. Pada mode development, cache service worker FlexKas lama dilepas.

Proyek ini terpisah dari SakuPintar dan pratinjau Sites sebelumnya. Repository tujuan: https://github.com/adityanurarif9-ai/FlexKas.git

## Impor Excel kas mingguan

Buka **Impor Excel** di beranda atau panel tim, pilih workbook dengan tab **Kas Tim** dan **Catatan Pembayaran**, lalu periksa pratinjau sebelum menekan **Gunakan data Excel ini**. File mentah dibaca di browser dan tidak diunggah atau disertakan ke GitHub. Setelah persetujuan Fakhri, catatan hasil impor disimpan ke database bersama.

Importer mendukung susunan workbook yang diberikan: lima anggota pada Kas Tim!B11:B15, nominal iuran di D7, saldo awal di G7, jadwal mingguan 2026 (baris 27–36) dan 2027 (baris 49–101), serta catatan pembayaran baris 8–807. Jika susunan berubah, importer menolak dengan keterangan, tanpa menyimpan sebagian data.

Status iuran memakai **tahun + nomor minggu** dari transaksi, bukan tanggal pembayaran. Bayar di muka, cicilan, dan lebih bayar tetap pada minggu yang dipilih. Nomor minggu mengikuti jadwal Excel dan dimulai ulang setiap tahun. Lebih bayar tidak otomatis dialokasikan ke minggu lain. Tanggal transaksi asli tetap dipakai untuk laporan arus kas bulanan. Ringkasan impor divalidasi terhadap total pemasukan, pengeluaran, saldo, dan setoran per anggota di Excel.

Impor mengganti kas bersama, bukan menambahkan duplikat. Cadangan data sebelum impor disimpan lokal dan dapat dipulihkan melalui panel impor. Data kas lain yang ingin disimpan sebaiknya diunduh sebagai cadangan sebelum impor. Perangkat anggota membaca data yang sama setelah login; tidak perlu mengimpor lagi.

Development dan preview memakai alamat tetap **http://127.0.0.1:5194/** agar data lokal tetap terlihat saat berpindah antara keduanya. Jalankan satu server saja. `npm test` menguji alokasi mingguan, cicilan, tahun pergantian, dan penolakan data tidak lengkap/tidak cocok.

## Ajakan instal saat pertama masuk

Pada kunjungan pertama melalui browser HP, FlexKas menampilkan ajakan pemasangan otomatis. Tombol Instal sekarang hanya memicu dialog sistem setelah diketuk dan setelah browser mengirim beforeinstallprompt. Jika belum tersedia, pengguna mendapat petunjuk pemasangan; iPhone memakai menu Bagikan → Tambahkan ke Layar Utama. Browser dalam aplikasi diberi petunjuk untuk membuka Chrome/Safari.

Nanti saja, tombol tutup, dan Escape menunda promosi selama tujuh hari pada browser tersebut. Penawaran muncul paling banyak sekali per kunjungan, tidak menimpa formulir yang sedang terbuka, serta disembunyikan dalam mode aplikasi terpasang. Setelah appinstalled, petunjuk pemasangan disembunyikan dengan penanda lokal; event beforeinstallprompt baru membatalkan penanda tersebut bila aplikasi dapat dipasang kembali. Preferensi instal terpisah dari penyimpanan kas.

Alamat produksi: https://kas-flexbox.vercel.app/. Pemasangan tetap memerlukan HTTPS atau localhost. Perilaku dialog bawaan ditentukan oleh browser; aplikasi tidak dapat memaksanya muncul tanpa ketukan.

## Rekap tahunan dan pembayaran sekaligus

- Buka **Laporan → Tahunan**, pilih tahun untuk saldo awal/akhir, total pemasukan/pengeluaran, grafik 12 bulan, rincian per bulan, dan rekap iuran per orang. **Ekspor rekap CSV** berisi ringkasan dan rekap iuran; **Transaksi CSV** berisi seluruh transaksi pada tahun terpilih. CSV dapat dibuka di Excel, dan Cetak tersedia untuk arsip.
- Saldo awal tahun mencakup saldo pembukaan ditambah seluruh transaksi sebelum tahun tersebut. Arus kas mengikuti tanggal pembayaran sebenarnya. Rekap iuran mengikuti tahun minggu tujuannya, sehingga bayar di muka pada Desember untuk Januari tidak salah dianggap pemasukan Januari.
- Fakhri membuka **Iuran Tim → Bayar 1 bulan / sekaligus**, memilih anggota, bulan kalender atau beberapa minggu, lalu tanggal pembayaran sebenarnya. Paket satu bulan mengikuti Jumat yang mulai pada bulan itu: empat atau lima minggu sesuai kalender. Minggu lunas dilewati; cicilan hanya ditambah sisanya. Tinjau total sebelum menyimpan.
- Satu pembayaran dipecah menjadi rincian per minggu dengan penanda pembayaran yang sama, disimpan dalam satu permintaan dengan pemeriksaan versi. Total rincian menambah kas satu kali; tidak ada transaksi ringkasan tambahan. Perubahan atau penghapusan dilakukan pada rincian minggu yang bersangkutan. Lebih bayar lama tidak otomatis dipindahkan ke minggu lain.
- Rekap sisa target tahunan mencakup minggu mendatang, sehingga berbeda dari tunggakan yang sudah jatuh tempo.
- Jabatan **Kiandra: Keamanan**, **Bima: Kreatif**. Keduanya tetap akun lihat saja. Label database proyek lama dapat diperbarui melalui `supabase/002_team_display_roles.sql`; tidak mengubah izin, identitas anggota, atau catatan kas.

## Pengingat per orang dan kotak Notifikasi

- **Iuran Tim**: hanya Fakhri yang memiliki **Ingatkan** untuk anggota belum lunas dan **Tes pengingat** per orang. Pengingat biasa dibatasi satu kali per akun + minggu + hari Jakarta. Minggu mendatang tidak ditagih. Tes dibatasi satu kali per akun tujuan per menit dan tetap tersedia untuk anggota yang sudah lunas; pesan ditandai sebagai tes.
- **Notifikasi** di navbar tersedia untuk setiap akun. Pesan hanya dapat diambil oleh pemilik akun yang sudah login; jumlah belum dibaca muncul pada badge. Tanda dibaca disimpan per akun pada perangkat tersebut. Kotak masuk dimuat ulang setiap 15 detik saat aplikasi terlihat dan saat menerima push.
- Riwayat pengingat yang sudah ada (`flex_reminder_deliveries`) menjadi sumber pesan biasa; `sent` berarti tersimpan di kotak masuk, bukan jaminan HP membunyikannya. Pesan tetap tersedia tanpa langganan push. API mengembalikan jumlah perangkat yang benar-benar menerima pengiriman secara terpisah. Tes terakhir berasal dari waktu pada `flex_push_test_limits`. Tidak perlu tabel, migrasi, atau kunci baru.
- Setelah minggu terkait lunas, pesan biasa dan badge disaring di server dan aplikasi. Notifikasi sistem yang masih tampil dapat ditutup oleh aplikasi saat status pembayaran akun tersebut tersinkron. Pesan tes tetap ditampilkan untuk pengecekan.
- Akun penglihat tidak memiliki kontrol pengiriman, tes, atau jadwal pengingat. Mereka hanya menerima pesan dan memberi **izin notifikasi pada perangkatnya sendiri** melalui halaman Notifikasi. Izin HP tidak dapat diberikan oleh Fakhri dari jarak jauh. Suara singkat dalam aplikasi berjalan saat ada pesan baru yang belum dibaca dan setelah interaksi pengguna; suara ketika aplikasi tertutup mengikuti pengaturan HP. Tidak ada alarm jam yang dijamin berbunyi.

## Alarm saat pengingat diterima

Ketika anggota sedang membuka FlexKas dan pengingat baru dari Fakhri diterima, panel alarm tampil dengan bunyi dua nada berulang selama maksimal 12 detik. Penerima dapat menekan Hentikan alarm atau Lihat notifikasi. Jika browser belum mengizinkan audio otomatis, panel menyediakan Bunyikan alarm yang dapat diketuk langsung. Fakhri tidak dapat memaksa izin audio atau volume pada perangkat orang lain.

Alarm hanya diputar untuk pesan baru dengan waktu penerimaan maksimal dua menit, menggunakan waktu server agar jam perangkat tidak mengubah penilaian. Pesan lama tetap dapat dibaca tanpa membunyikan alarm saat login. Pesan yang sudah diumumkan tidak membunyikan alarm ulang. Alarm berhenti ketika aplikasi disembunyikan, akun keluar/berganti, atau pengingat biasa tidak relevan lagi karena minggu tersebut lunas. Pesan Tes tetap boleh memicu alarm meskipun lunas.

Saat aplikasi tertutup, push memakai suara notifikasi bawaan perangkat; bunyi alarm 12 detik hanya dijalankan dalam aplikasi yang terbuka. Tidak ada perubahan data kas, hak akses, schema database, atau kunci konfigurasi untuk pembaruan ini.
