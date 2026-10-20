# E-Rapor SMP Al-Hidayah

Frontend aplikasi E-Rapor dibuat dengan Next.js App Router dan berkomunikasi dengan Express API.

## Pengembangan lokal

1. Salin `.env.example` ke `.env.local` dan atur `NEXT_PUBLIC_API_BASE_URL` jika backend tidak berjalan pada `http://localhost:3001`.
2. Jalankan `npm install`.
3. Pastikan backend berjalan dan origin frontend diizinkan melalui `FRONTEND_ORIGINS` pada backend.
4. Jalankan `npm run dev`, lalu buka `http://localhost:3000`.

Akun dibuat oleh administrator sekolah. Sesi autentikasi menggunakan cookie HttpOnly dari backend.

Dokumentasi backend, skema data, dan langkah backfill riwayat akademik berada di [`../DOKUMENTASI_PROYEK.txt`](../DOKUMENTASI_PROYEK.txt).
