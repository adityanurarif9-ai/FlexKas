# Mengaktifkan akun dan pengingat FlexKas

Kode sudah disiapkan. Akun, kas bersama, dan pengingat baru aktif setelah langkah di bawah selesai. Gunakan **proyek Supabase baru khusus FlexKas**, terpisah dari SakuPintar. Tidak ada password bawaan atau akun demo yang dapat melewati login.

## 1. Buat database tim

1. Buat proyek di dashboard Supabase, simpan password database secara pribadi.
2. Pada pengaturan Authentication, **matikan pendaftaran pengguna baru / Allow new users to sign up**. Lima akun dibuat oleh pengelola melalui skrip, bukan daftar sendiri.
3. Buka SQL Editor, tempel seluruh isi `supabase/001_team_accounts.sql`, lalu Run. Skrip boleh dijalankan ulang; kas yang sudah ada tidak dihapus.
4. Dari Connect / API Keys, ambil Project URL dan publishable key. Ambil juga service_role key untuk **pengelola/server saja**, bukan aplikasi browser.

## 2. Hubungkan di komputer pengelola

Di folder proyek, salin `.env.example` menjadi `.env.local`. Isi:

```dotenv
VITE_SUPABASE_URL=https://PROJECT-FLEXKAS.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=PUBLIC_KEY_PROYEK_FLEXKAS
SUPABASE_URL=https://PROJECT-FLEXKAS.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SERVICE_ROLE_KEY_PRIVAT
```

Jangan mengunggah `.env.local` atau `.local-data/` ke GitHub. Keduanya sudah diabaikan Git. Jangan kirim service key atau file password ke chat/grup. URL dan publishable key boleh dipakai di frontend; hak akses kas tetap diperiksa database.

Jalankan dengan Node 22 atau lebih baru:

```powershell
npm install
npm run setup:accounts
```

Skrip membuat akun terkonfirmasi tanpa mengirim email, lalu menghubungkannya ke profil tepercaya:

| Akun | Jabatan | Hak akses |
| --- | --- | --- |
| fakhri@flexboxstudio.site | Bendahara | Admin, mengubah kas |
| adit@flexboxstudio.site | Leader | Melihat saja |
| rainer@flexboxstudio.site | Wakil Leader | Melihat saja |
| kiandra@flexboxstudio.site | Keamanan | Melihat saja |
| bima@flexboxstudio.site | Kreatif | Melihat saja |

Password acak masing-masing disimpan dalam file privat di `.local-data/akun-flexkas-....txt`. Terminal hanya menampilkan lokasi file. Bagikan setiap password hanya ke pemiliknya melalui saluran pribadi, kemudian minta menggantinya melalui **Akun → Ganti password**. Alamat-alamat tersebut merupakan nama login, tidak membutuhkan kotak email dan tidak dipakai untuk verifikasi atau pemulihan email.

Jika skrip berhenti di tengah, **jangan hapus pengguna atau mengambil alih email yang sudah ada**. Periksa Auth Users, `flex_profiles`, dan file lokal yang sudah dibuat. Akun baru yang profilnya gagal dipasang memiliki UUID di file tersebut; setelah memastikan UUID itu benar-benar dibuat oleh skrip, owner dapat menambahkan pemetaan yang hilang lewat SQL Editor. Untuk melanjutkan akun yang belum dibuat, tentukan hanya nama yang tersisa, misalnya `npm run setup:accounts -- rainer kiandra bima`, setelah pemeriksaan; skrip sengaja berhenti pada akun duplikat. Mengubah `user_metadata` tidak memberikan hak admin.

## 3. Aktifkan login pada Vercel

Pada proyek **kas-flexbox**, buka **Environment Variables**. Tambahkan ke Production:

| Nama | Nilai / kegunaan |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL FlexKas |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key, tipe Config |
| `SUPABASE_URL` | Project URL yang sama |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key, tipe Secret, khusus server |

Redeploy setelah menyimpan variabel. Jangan menambahkan `VITE_` pada service key. Tanpa kedua variabel frontend, halaman login menampilkan pesan konfigurasi belum siap dan tombol masuk dinonaktifkan. Environment Vercel tidak otomatis mengisi `.env.local`, atau sebaliknya.

Masuk sebagai Fakhri. Pilih **Impor Excel**, tinjau ringkasan, lalu simpan. File Excel dibaca di browser; **hasil catatan kasnya disimpan ke database bersama**. File mentah tidak diunggah. Impor mengganti kas bersama, sehingga ekspor/cadangkan data yang diperlukan terlebih dahulu. Saldo awal database nol; riwayat asli tidak dimasukkan ke kode/GitHub. Anggota tidak perlu mengimpor ulang.

Periksa dengan akun Adit: buku kas dan status iuran terlihat, tombol ubah tidak tersedia. Permintaan ubah langsung ke database pun ditolak. Perubahan dari perangkat lain dibaca ulang setiap 60 detik saat aplikasi terlihat; tombol Muat ulang dapat dipakai kapan saja. Jika dua perangkat admin menyimpan bersamaan, versi lama ditolak agar tidak menimpa perubahan baru.

## 4. Aktifkan push notification

Di komputer pengelola:

```powershell
npm run setup:push
```

Hasilnya `.local-data/push.env` berisi pasangan VAPID dan CRON_SECRET acak. Skrip tidak menimpa kunci yang sudah ada. Simpan kunci ini untuk penggunaan berkelanjutan; mengganti VAPID mengharuskan perangkat mendaftar ulang.

Tambahkan ke Vercel Production, kemudian redeploy:

| Variabel | Jenis |
| --- | --- |
| `VITE_VAPID_PUBLIC_KEY` | Config, kunci publik |
| `VAPID_PUBLIC_KEY` | Config, sama persis dengan kunci publik di atas |
| `VAPID_PRIVATE_KEY` | Secret, khusus server |
| `VAPID_SUBJECT` | Config, `https://kas-flexbox.vercel.app` |
| `CRON_SECRET` | Secret, string acak dari file, minimal 32 karakter |

Kunci privat, service key, dan CRON_SECRET **tidak boleh memakai awalan `VITE_`**. Pemeriksaan build menolak penempatan rahasia pada beberapa nama frontend yang keliru.

Pada HP masing-masing anggota:

1. Buka `https://kas-flexbox.vercel.app`, pasang ke layar utama, lalu buka ikon FlexKas.
2. Masuk dengan akunnya sendiri.
3. Buka **Notifikasi** di navbar → **Izinkan notifikasi HP**, lalu izinkan permintaan sistem.
4. Minta Fakhri membuka **Iuran Tim → Tes pengingat** pada baris akunmu. Tes dibatasi satu kali per akun tujuan per 60 detik dan tetap dapat diterima saat sudah lunas.
5. Ketuk aplikasi agar browser mengizinkan suara. Suara singkat berjalan saat pesan baru muncul, setelah ada interaksi pengguna.

iPhone membutuhkan iOS 16.4 atau lebih baru, pemasangan ke layar utama, dan ketukan pengguna untuk meminta izin. Di Safari biasa, pasang dahulu melalui Bagikan → Tambahkan ke Layar Utama. Pengaturan Focus, senyap, baterai, internet, serta kebijakan browser dapat menunda atau membisukan notifikasi. Suara khusus hanya berjalan ketika aplikasi terbuka dan sudah berinteraksi; saat tertutup suara mengikuti pengaturan HP. Ini pengingat, bukan alarm jam yang dijamin berbunyi.

Jadwal Vercel di `vercel.json` meminta pengingat harian pukul 11:00 UTC / 18:00 WIB. Pada paket Hobby waktu eksekusi bisa bergeser dalam satu jam; jangan mengandalkan menit yang tepat. Fakhri juga dapat menekan **Ingatkan yang belum lunas** atau **Ingatkan** pada baris tiap orang di Iuran Tim. Hanya empat akun anggota yang belum melunasi **minggu berjalan**, memiliki perangkat terdaftar, dan belum diberi pengingat pada hari Jakarta yang sama yang dituju. Maksimal satu pengiriman berhasil per anggota + minggu + hari; tes pribadi terpisah. Tidak ada notifikasi ke nomor HP atau email, dan tidak ada permintaan izin otomatis saat membuka halaman.

Nama dan nominal tidak ditampilkan pada notifikasi layar kunci. Rincian dilihat setelah membuka aplikasi dan login. Keluar akun mematikan langganan perangkat; akun lain pada HP yang sama perlu mengaktifkan notifikasi lagi.

## 5. Cara memeriksa dan pemulihan

- Supabase → Authentication → Users: lima pengguna terkonfirmasi.
- Table Editor → `flex_profiles`: tepat satu UUID Auth per nama anggota; hanya owner/server yang dapat mengubah pemetaan ini.
- `flex_members`: Fakhri `admin`, empat lainnya `viewer`.
- `flex_wallet`: satu baris dengan versi/revision yang bertambah setelah Fakhri menyimpan.
- `flex_push_subscriptions`: muncul setelah anggota mengizinkan notifikasi. Perlakukan endpoint dan kuncinya sebagai data privat.
- `flex_reminder_deliveries`: status `sent`, `failed`, atau `processing`. Pengiriman gagal dapat dicoba ulang; klaim yang terhenti dapat dicoba lagi setelah 15 menit.
- Vercel → Logs / Cron Jobs: periksa jadwal dan hasil API. Endpoint jadwal memerlukan CRON_SECRET; tombol admin memerlukan sesi Fakhri.

Lupa password tidak memakai email. Owner yang memegang service key dapat menjalankan:

```powershell
node --env-file=.env.local scripts/reset-password.mjs adit
```

Ganti nama terakhir sesuai akun. Skrip mencari UUID dari pemetaan profil tepercaya, membuat password acak baru, dan menyimpannya hanya dalam file `.local-data/reset-....txt`. Berikan secara pribadi dan minta pengguna menggantinya. Hak admin Fakhri di aplikasi tidak memberinya service key atau kemampuan mengubah pemetaan akun.

Jangan menjalankan skrip akun/reset menggunakan kunci proyek SakuPintar. Untuk pekerjaan lokal, `npm run dev` mendukung login dan kas Supabase; push/API jadwal perlu lingkungan Vercel produksi.

Referensi: [Supabase admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Web Push iPhone](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [jadwal Vercel Hobby](https://vercel.com/docs/cron-jobs/usage-and-pricing).


Pembaruan kotak Notifikasi: tidak perlu mengulang SQL atau mengganti kunci. Pesan biasa dibaca dari riwayat pengingat yang sudah tersedia dan disembunyikan setelah minggu terkait lunas. Status `sent` kini berarti pesan tersimpan di kotak masuk; keberhasilan push ke perangkat dihitung terpisah. Anggota tanpa izin push tetap dapat membaca kotak masuk. Pesan uji terakhir tetap tampil meskipun lunas. Penglihat tidak dapat mengirim atau mengatur pengingat; izin notifikasi perangkat diberikan sendiri lewat halaman Notifikasi.
