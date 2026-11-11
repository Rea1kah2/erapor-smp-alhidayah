# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Administrator / Staf Tata Usaha (TU)**: Mengelola master data sekolah (guru, siswa, kelas 7-9, mata pelajaran, tahun ajaran aktif, penugasan mengajar/wali), memantau statistik, dan mencetak rapor seluruh siswa.
2. **Guru Mata Pelajaran**: Menginput dan memperbarui nilai harian/tugas (bobot 40%), UTS (bobot 30%), dan UAS (bobot 30%) untuk kelas dan mata pelajaran yang diampunya di tahun ajaran aktif.
3. **Wali Kelas**: Memantau rekapitulasi nilai kumulatif, peringkat/ranking siswa secara dinamis, menginput presensi (Sakit, Izin, Alfa), catatan sikap spiritual & sosial, ekstrakurikuler, catatan bimbingan, status kenaikan kelas, dan mencetak lembar rapor resmi siswa binaannya.
4. **Siswa**: Memeriksa riwayat akademik mandiri, capaian nilai per mapel terhadap KKM (default 75.0), presensi, catatan wali, dan mencetak lembar rapor pribadi.
5. **Orang Tua / Wali Murid**: Memantau evaluasi belajar anak secara transparan dan mencetak lembar rapor resmi dari rumah.

## Product Purpose

Sistem Informasi Evaluasi Belajar Peserta Didik & Rekapitulasi E-Rapor Digital terintegrasi berbasis web untuk SMP Al-Hidayah Medan. Menggantikan proses manual berbasis lembaran kertas/Excel yang terpisah dan rawan kesalahan perhitungan, menjadi sistem terpusat yang aman, transparan, dan siap cetak format resmi A4 kedinasan.

## Positioning

Sistem e-rapor sekolah menengah pertama dengan kepatuhan skema snapshot riwayat multi-tahun ajaran (`TahunAjaran`, `RiwayatKelas`, `PenugasanMapel`, `PenugasanWali`), formula pembobotan proporsional adaptif (Tugas 40%, UTS 30%, UAS 30%), RBAC ketat via cookie HttpOnly, dan lembar cetak standar kedinasan Kemendikbudristek lengkap dengan kop surat resmi SMP Al-Hidayah Medan.

## Operating Context

- Digunakan oleh guru di ruang guru / rumah saat masa penilaian akhir semester (penilaian puluhan hingga ratusan siswa sekaligus).
- Digunakan oleh tata usaha untuk administrasi master data dan penugasan tahunan.
- Digunakan oleh orang tua dan siswa saat pembagian rapor semester.
- Lingkungan cetak: Printer kantor sekolah standar (kertas A4, cetak hitam-putih atau warna).

## Capabilities and Constraints

- **Backend**: Node.js v18+, Express.js v5, TypeScript, Prisma ORM v5.19, PostgreSQL (Neon Cloud / Local).
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React.
- **Autentikasi**: JWT via HttpOnly Cookies, CORS whitelist origin, sanitasi input.
- **Formula Penilaian**: Nilai Akhir NA = (Tugas * 0.4) + (UTS * 0.3) + (UAS * 0.3); Predikat A (>=90), B (>=80), C (>=KKM / 75), D (<KKM).
- **Integritas Data**: Riwayat akademik terkunci per tahun ajaran; perubahan kelas tahun baru tidak menghapus riwayat tahun terdahulu.

## Brand Commitments

- Nama Resmi: SMP AL-HIDAYAH MEDAN
- Yayasan: YAYASAN PENDIDIKAN ISLAM AL-HIDAYAH
- NPSN: 10210892
- Alamat: Jl. Letda Sujono No. 64, Medan Tembung, Kota Medan, Sumatera Utara
- Telepon: (061) 7362819
- Nuansa Visual: Academic Heritage & Islamic Dignity (Deep Emerald Green, Warm Brass, Crisp Paper Neutrals).

## Product Principles

1. **Presisi & Kepercayaan Data**: Setiap angka nilai dan kalkulasi peringkat harus 100% akurat, transparan, dan tidak boleh hilang saat penginputan.
2. **Ergonomi Kerja Guru (Operate Mode First)**: Antarmuka input data harus cepat, mendukung navigasi keyboard, minim klik, dan bebas dari ornamen visual yang mengaburkan data.
3. **Standar Dokumen Kedinasan**: Format cetak rapor harus mematuhi kaidah tipografi dan tata letak dokumen resmi dinas pendidikan di Indonesia.
4. **Keamanan & Akuntabilitas**: Hak akses guru mapel dan wali kelas terisolasi ketat; siswa dan orang tua hanya melihat data miliknya.

## Accessibility & Inclusion

- Rasio kontras teks minimal 4.5:1 (WCAG AA).
- Dukungan keyboard navigation penuh untuk tabel input nilai.
- Warna status tuntas/remedial tidak hanya mengandalkan warna, tetapi juga dilengkapi teks predikat dan angka numerik yang jelas.
