# Design System: Academic Heritage & Islamic Dignity
## SMP Al-Hidayah Medan E-Rapor

<!-- impeccable:design-schema 1 -->

## Direction & Philosophy
Antarmuka dirancang dengan pendekatan **Operate Mode** (fungsional, presisi tinggi, minim distraksi untuk pendidik) yang dibalut keanggunan **Academic Heritage & Islamic Dignity**. Menghilangkan ornamen AI-slop seperti bola-bola blur melayang dan slider transparansi kaca, beralih ke permukaan *crisp paper* dengan sentuhan *subtle frosted glass* pada sidebar navigasi dan modal.

## Color Tokens

### Primary Palette (Al-Hidayah Emerald & Brass)
- `--color-primary`: `#14532d` (Emerald 900 - Warna dasar resmi, wibawa kelembagaan)
- `--color-primary-hover`: `#166534` (Emerald 800)
- `--color-primary-subtle`: `#f0fdf4` (Emerald 50 - Background aksen lembut)
- `--color-accent`: `#b45309` (Warm Brass / Amber 700 - Aksen prestisius & kehormatan)
- `--color-accent-hover`: `#92400e` (Amber 800)
- `--color-accent-subtle`: `#fef3c7` (Amber 100 - Badge sorotan)

### Surface & Neutral Tokens (Crisp Paper)
- `--color-bg`: `#f8fafc` (Slate 50 / Crisp Ivory Paper di Light Mode)
- `--color-card`: `#ffffff` (Solid Card Surface)
- `--color-card-subtle`: `#f1f5f9` (Slate 100)
- `--color-border`: `#e2e8f0` (Slate 200 - Garis batas tegas 1px)
- `--color-border-strong`: `#cbd5e1` (Slate 300)

### Dark Mode Tokens (Deep Obsidian Emerald)
- `--color-bg-dark`: `#0a110e` (Obsidian with deep emerald undertone)
- `--color-card-dark`: `#111c17`
- `--color-card-subtle-dark`: `#182720`
- `--color-border-dark`: `#22382d`
- `--color-border-strong-dark`: `#2f4e3f`

### Semantic Academic Status
- `--status-pass`: `#15803d` / bg: `#f0fdf4` (Tuntas KKM)
- `--status-fail`: `#b91c1c` / bg: `#fef2f2` (Perlu Remedial / < KKM)
- `--status-dirty`: `#d97706` / bg: `#fffbeb` (Perubahan Belum Disimpan)
- `--status-info`: `#0369a1` / bg: `#f0f9ff` (Informasi / Panduan)

## Typography Scale
- **Font Family**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Data & Numbers**: `tabular-nums` untuk semua kolom nilai numerik, NISN, NIP, ranking, dan tanggal.
- **Hierarki**:
  - Page Heading: `text-2xl font-bold tracking-tight text-slate-900`
  - Section Heading: `text-lg font-semibold text-slate-800`
  - Table Header: `text-xs font-semibold uppercase tracking-wider text-slate-600`
  - Body Text: `text-sm text-slate-700`
  - Caption / Metadata: `text-xs text-slate-500`

## Glassmorphism Policy (Subtle Translucency)
- **Hanya Diperbolehkan Pada**: Sidebar navigasi kiri (`backdrop-blur-md bg-white/85 dark:bg-[#111c17]/85 border border-slate-200/80`) dan backdrop modal pop-up.
- **Dilarang Pada**: Tabel matriks nilai, form input teks/angka, kartu data utama, dan lembar cetak dokumen A4. Semua area kerja harus menggunakan background solid berkontras tinggi (rasio kontras >= 4.5:1).

## Component Conventions
1. **Button Primary**: Warna Emerald 900 (`bg-[#14532d] hover:bg-[#166534] text-white rounded-lg font-medium shadow-sm transition-colors`).
2. **Button Accent / Action**: Warna Warm Brass (`bg-[#b45309] hover:bg-[#92400e] text-white rounded-lg`).
3. **Form Inputs**: Height 40px (`h-10 px-3 rounded-lg border border-slate-200 focus:border-[#14532d] focus:ring-2 focus:ring-[#14532d]/20 outline-none text-sm transition-all`).
4. **Table Rows**: Tinggi baris 48px, hover background `hover:bg-slate-50/80 dark:hover:bg-slate-800/40`, sticky header `sticky top-0 bg-slate-50 dark:bg-slate-900 z-10`.
5. **Printable Document**: `@media print` murni: font serif/sans hitam-putih, border hitam 1px tegas, Kop Surat standar kedinasan dengan garis ganda (*double rule*).
