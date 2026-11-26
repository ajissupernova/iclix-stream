# iClix

Katalog film dan serial TV (tanpa pemutaran) dengan React, TypeScript, Vite,
Tailwind CSS, dan data asli dari TMDb (The Movie Database).

iClix tidak menyimpan, memutar, atau mendistribusikan video apa pun. Trailer
hanya membuka video YouTube resmi dari TMDb.

## Persiapan API key TMDb

Server proxy membaca key dari file `.env` (tidak pernah dikirim ke browser).

1. Buat akun di https://www.themoviedb.org/
2. Buka https://www.themoviedb.org/settings/api
3. Salin **API Key (v3)**, atau **API Read Access Token (v4)**
4. Salin `.env.example` menjadi `.env`, lalu isi kredensial TMDb dan admin:

```bash
TMDB_API_KEY=isi_api_key_v3_di_sini
# atau
TMDB_READ_ACCESS_TOKEN=isi_read_access_token_v4_di_sini
ADMIN_SECRET=secret_acak_minimal_16_karakter
```

Tanpa key, aplikasi tetap jalan dan menampilkan pesan konfigurasi di setiap
bagian yang butuh data.

Untuk membuka panel pengelolaan, isi `ADMIN_SECRET` memakai nilai acak yang
panjang. Panel tersedia di `/kelola`; alamatnya tidak ditautkan di navigasi
publik, dan semua operasi tulis tetap memerlukan sesi server yang dibuat setelah
memasukkan secret. Buat secret dengan:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Saat dijalankan lokal, draft, publikasi, koleksi, riwayat, dan gambar unggahan
disimpan di `.data`. Di Vercel, data tersebut disimpan di private Vercel Blob.
Unggahan JPG, PNG, atau WebP dibatasi maksimal 3 MB.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173 (dev server + proxy /api/tmdb)
```

Produksi (server Node dengan fallback rute SPA):

```bash
npm run build    # membangun dist/ dan dist-server/
npm start        # http://localhost:3000 (PORT di .env bisa mengubahnya)
```

Perintah lain:

```bash
npm run preview  # pratinjau build + proxy /api/tmdb
npm run typecheck
```

Butuh Node.js 18 atau lebih baru.

## Fitur

- Beranda: carousel spotlight, section katalog yang dapat disusun dari panel
  admin, koleksi pilihan, dan pengumuman
- Panel kurasi `/kelola`: spotlight populer/tren/acak/manual, atur section,
  koleksi dan panduan menonton, pengumuman, draft, publikasi, serta pemulihan
  riwayat
- Halaman koleksi tematik dengan daftar film/serial, catatan urutan menonton,
  logo, latar, dan section editorial; koleksi bisa tampil sebagai banner lebar
  atau baris thumbnail geser dengan urutan dan titik crop gambar yang dapat
  diatur terpisah untuk beranda dan halaman koleksi
- Katalog film (`/katalog`) dan serial (`/serial`): filter genre, urutan
  (popularitas, rating, rilis, judul), paginasi
- Pencarian (`/cari`): debounce 400 ms, tab Semua/Film/Serial, hasil film,
  serial, dan orang, paginasi, status memuat/kosong/galat
- Detail film (`/film/:id`): sutradara, penulis, produser, pemeran, kata
  kunci, film serupa, rekomendasi, trailer resmi
- Detail serial (`/serial/:id`): pilih musim, daftar episode, kreator, pemeran
- Profil orang (`/orang/:id`): biografi dan filmografi film/serial
- Daftar Saya (`/daftar-saya`): tersimpan di localStorage perangkat
- Tombol bahasa ID/EN (mengubah bahasa data yang diminta dari TMDb)
- Sinopsis, biografi, dan sinopsis episode yang belum tersedia di id-ID
  diterjemahkan otomatis dari bahasa Inggris; tagline dibiarkan apa adanya

## Catatan terjemahan

TMDb tidak selalu punya teks bahasa Indonesia. Bila sinopsis, biografi, atau
sinopsis episode kosong di id-ID, server mengambil versi Inggris lalu
menerjemahkannya lewat layanan terjemahan Google. Hasilnya disimpan di cache
server. Bila terjemahan gagal, teks Inggris tetap ditampilkan dengan catatan
bahasanya.

Tagline tidak diterjemahkan karena kalimatnya pendek sehingga hasil mesin sering
kehilangan nada aslinya. Bila tagline id-ID kosong, tagline Inggris dipakai apa
adanya.

## Struktur

```
server/          proxy TMDb (Node, tanpa dependency): env, cache, allowlist, statis
vite.config.ts   memasang proxy /api/tmdb sebagai middleware dev dan preview
src/
  api/           client fetch, endpoints, tipe TMDb, transform, URL gambar
  components/    Navbar, Footer, HeroCarousel, MediaRow, MediaCard, CatalogView, dll.
  context/       Language (bahasa), Watchlist (Daftar Saya)
  hooks/         useApi, useDebounced, useHeroDetails, dll.
  pages/         Home, Catalog, TvCatalog, Search, MovieDetail, TvDetail,
                 PersonDetail, MyList, About
```

## Catatan keamanan

- `.env` masuk `.gitignore`; hanya `.env.example` yang dibagikan
- Data situs berada di `.data/` dan tidak masuk Git
- Secret admin hanya diperiksa server; sesi memakai cookie HttpOnly dan
  SameSite=Strict. Jangan membagikan `ADMIN_SECRET`
- Key TMDb hanya dibaca server (`server/env.ts`), tidak pernah masuk bundle
  frontend
- Proxy memakai allowlist endpoint, allowlist parameter, dan hanya bahasa
  `id-ID`/`en-US`
- Endpoint terjemahan dibatasi ukuran teks, jumlah teks per permintaan, dan
  laju permintaan per alamat IP
- Cache server: daftar/pencarian 5 menit, detail 6 jam, konfigurasi/genre
  24 jam, dengan stale-while-error

## Deploy ke Vercel

1. Push repository ini ke GitHub, lalu impor repository tersebut dari dashboard Vercel.
2. Gunakan pengaturan build dari `vercel.json` (`npm run build`, output `dist`).
3. Jika panel admin akan digunakan, buat **private Vercel Blob store** dari tab **Storage** proyek dan hubungkan ke project untuk Production. Pastikan koneksi menyediakan `BLOB_STORE_ID` dan autentikasi OIDC, atau tambahkan `BLOB_READ_WRITE_TOKEN`.
4. Tambahkan `TMDB_API_KEY` atau `TMDB_READ_ACCESS_TOKEN`, serta `ADMIN_SECRET`, di Project Settings → Environment Variables.
5. Deploy ulang setelah menghubungkan Blob atau mengubah environment variables.

`api/[...path].ts` menjalankan endpoint TMDb, terjemahan, dan konten situs sebagai Vercel Function. `vercel.json` mengarahkan rute aplikasi React ke `index.html`. Untuk menjalankan lokal, gunakan `npm run dev`; `.env.example` menjadi contoh variabel lokal.

### Penyimpanan Vercel

Vercel Functions tidak menyediakan disk persisten atau memori bersama antar-instance. Panel admin memakai private Vercel Blob untuk menyimpan konten situs dan gambar unggahan; hubungkan Blob store sebelum menggunakan fitur simpan di produksi. Cache dan batas percobaan login berbasis memori hanya bersifat sementara.

Jangan commit `.env` atau memasukkan secret ke kode frontend. Isi environment variables melalui pengaturan lokal atau dashboard hosting.

## Push ke GitHub

```bash
git add .
git commit -m "Prepare project for deployment"
git push
```

GitHub Actions menjalankan `npm ci`, pemeriksaan TypeScript, dan build pada setiap push dan pull request.
