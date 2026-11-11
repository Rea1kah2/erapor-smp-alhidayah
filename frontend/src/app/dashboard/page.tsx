// frontend/src/app/dashboard/page.tsx
'use client';
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  GraduationCap, 
  School, 
  BookOpen, 
  FileSpreadsheet, 
  Award, 
  CheckCircle2, 
  User,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  MessageSquare
} from 'lucide-react';

interface SubjectSummary { id: string; nama: string; kkm: number; }
interface DashboardProfile {
  email: string;
  role: string;
  guru?: {
    nama: string;
    nip: string | null;
    kelasWali: { nama: string; tingkat: number } | null;
    mapel: SubjectSummary[];
    penugasanWali: Array<{ kelas: { id: string; nama: string; tingkat: number } }>;
    penugasanMapel: Array<{ mapel: SubjectSummary; kelas: { id: string; nama: string } }>;
  } | null;
  siswa?: { nama: string; nisn: string; kelas: { nama: string; tingkat: number; wali?: { nama: string } | null } | null } | null;
  ortu?: { nama: string; nik?: string; anak: Array<{ id: string; nama: string; nisn: string; kelas: { nama: string; tingkat: number; wali?: { nama: string } | null } | null }> } | null;
}

export default function DashboardHome() {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [stats, setStats] = useState({ siswa: 0, guru: 0, kelas: 0, mapel: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resProfile = await apiFetch('/api/auth/me');
        if (resProfile.ok) {
          const profileData = await resProfile.json();
          setProfile(profileData.user);

          if (profileData.user?.role === 'ADMIN') {
            const resStats = await apiFetch('/api/master/stats');
            if (resStats.ok) setStats(await resStats.json());
          }
        }
      } catch {
        console.error('Gagal mengambil data dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const role = profile?.role || 'ADMIN';

  // ================= 1. ADMIN VIEW =================
  if (role === 'ADMIN') {
    const kpiCards = [
      { label: 'Peserta Didik', value: stats.siswa, icon: GraduationCap, href: '/dashboard/siswa', desc: 'Siswa aktif terdaftar' },
      { label: 'Tenaga Pendidik', value: stats.guru, icon: Users, href: '/dashboard/guru', desc: 'Guru & Wali kelas' },
      { label: 'Kelas', value: stats.kelas, icon: School, href: '/dashboard/akademik', desc: 'Kelas tingkat 7, 8, 9' },
      { label: 'Mata Pelajaran', value: stats.mapel, icon: BookOpen, href: '/dashboard/akademik', desc: 'Kurikulum standar KKM' },
    ];

    return (
      <div className="flex flex-col gap-6">
        
        {/* Welcome Section */}
        <div className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">Panel Administrasi Utama</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label">
              Selamat Datang di Portal Administrator
            </h1>
            <p className="text-sm text-label-secondary mt-1">
              Sistem E-Rapor SMP Al-Hidayah Medan &bull; Masuk sebagai <span className="font-semibold text-label">{profile?.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-subtle border border-primary-border text-primary text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              Sistem Aktif
            </span>
          </div>
        </div>

        {/* KPI Cards (2 Columns on Mobile, 4 Columns on Large Screen) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpiCards.map((kpi, idx) => (
            <Link key={idx} href={kpi.href}>
              <div className="bg-card hover:bg-card-subtle border border-separator rounded-xl p-3.5 sm:p-5 flex flex-col gap-2 sm:gap-3 transition-colors shadow-sm cursor-pointer group h-full">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] sm:text-xs font-semibold text-label-secondary uppercase tracking-wider truncate">{kpi.label}</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-subtle border border-primary-border text-primary flex items-center justify-center shrink-0">
                    <kpi.icon size={16} strokeWidth={2} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-0.5 sm:mt-1">
                  <span className="text-2xl sm:text-3xl font-bold tabular-nums text-label">{kpi.value}</span>
                  <ArrowRight size={14} className="text-label-tertiary group-hover:text-primary transition-colors hidden sm:inline" />
                </div>
                <span className="text-[11px] sm:text-xs text-label-secondary line-clamp-1">{kpi.desc}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Management & Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-base font-semibold text-label">Pintasan Pengelolaan Sistem</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/manajemen" className="p-3.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle transition-colors flex flex-col gap-1.5">
                <ShieldCheck size={20} className="text-accent" />
                <span className="font-semibold text-sm text-label">Manajemen Akun</span>
                <span className="text-xs text-label-secondary">Registrasi 5 Role & ID Unik</span>
              </Link>
              <Link href="/dashboard/guru" className="p-3.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle transition-colors flex flex-col gap-1.5">
                <Users size={20} className="text-primary" />
                <span className="font-semibold text-sm text-label">Data Guru</span>
                <span className="text-xs text-label-secondary">Manajemen profil & NIP</span>
              </Link>
              <Link href="/dashboard/siswa" className="p-3.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle transition-colors flex flex-col gap-1.5">
                <GraduationCap size={20} className="text-primary" />
                <span className="font-semibold text-sm text-label">Data Siswa</span>
                <span className="text-xs text-label-secondary">Penempatan kelas & NISN</span>
              </Link>
              <Link href="/dashboard/akademik" className="p-3.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle transition-colors flex flex-col gap-1.5">
                <School size={20} className="text-accent" />
                <span className="font-semibold text-sm text-label">Kelas & Mapel</span>
                <span className="text-xs text-label-secondary">Tingkat 7, 8, 9 & standar KKM</span>
              </Link>
            </div>
          </section>

          <section className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-label mb-2">Integritas Standar Penilaian</h2>
              <p className="text-sm text-label-secondary leading-relaxed">
                Penilaian menggunakan formula pembobotan proporsional (Tugas 40%, UTS 30%, UAS 30%) dengan batas ketuntasan minimal KKM 75.0. RBAC multi-role aktif melindungi validitas input nilai.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-bg border border-separator flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-primary shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-label">Sistem Evaluasi Belajar Terverifikasi</span>
              </div>
              <span className="text-xs font-semibold text-primary bg-primary-subtle border border-primary-border px-2.5 py-0.5 rounded-full">
                Tahun Ajaran Aktif &amp; Terlindungi
              </span>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ================= 2. GURU WALI VIEW =================
  if (role === 'GURU_WALI') {
    const guruData = profile?.guru;
    const kelasWaliList = guruData?.penugasanWali.length
      ? guruData.penugasanWali.map((assignment) => assignment.kelas)
      : guruData?.kelasWali ? [guruData.kelasWali] : [];
    const kelasWali = kelasWaliList[0];
    const mapelAjar = guruData?.penugasanMapel.length
      ? [...new Map(guruData.penugasanMapel.map((assignment) => [assignment.mapel.id, assignment.mapel])).values()]
      : guruData?.mapel || [];

    return (
      <div className="flex flex-col gap-6">
        <div className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-subtle border border-primary-border text-primary">
                Wali Kelas {kelasWali?.nama || ''}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label">
              Selamat Datang, {guruData?.nama || 'Bapak/Ibu Wali Kelas'}
            </h1>
            <p className="text-sm text-label-secondary mt-1">
              Pembimbing Akademik & Wali Kelas SMP Al-Hidayah Medan {guruData?.nip && <span className="font-mono text-xs font-medium ml-2 px-2 py-0.5 rounded bg-fill">NIP: {guruData.nip}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href="/dashboard/wali"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm"
            >
              <Award size={16} />
              <span>Buka Catatan & Rekap Rapor</span>
            </Link>
          </div>
        </div>

        {/* Wali Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-card border border-separator rounded-xl p-5 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between text-label-secondary">
              <span className="text-xs font-semibold uppercase tracking-wider">Kelas Binaan</span>
              <School size={18} className="text-primary" />
            </div>
            <span className="text-2xl font-bold text-label">
              {kelasWali ? `Kelas ${kelasWali.nama}` : 'Belum Ditugaskan'}
            </span>
            <span className="text-xs text-label-secondary">
              {kelasWali ? `Jenjang Tingkat ${kelasWali.tingkat} SMP` : 'Hubungi Administrator'}
            </span>
          </div>

          <div className="bg-card border border-separator rounded-xl p-5 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between text-label-secondary">
              <span className="text-xs font-semibold uppercase tracking-wider">Pintasan Siswa</span>
              <GraduationCap size={18} className="text-accent" />
            </div>
            <Link 
              href="/dashboard/siswa"
              className="text-lg font-bold text-primary hover:underline flex items-center gap-1.5"
            >
              <span>Daftar Siswa Binaan</span>
              <ArrowRight size={16} />
            </Link>
            <span className="text-xs text-label-secondary">Periksa kelengkapan data & orang tua</span>
          </div>

          <div className="bg-card border border-separator rounded-xl p-5 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between text-label-secondary">
              <span className="text-xs font-semibold uppercase tracking-wider">Tugas Mapel Tambahan</span>
              <BookOpen size={18} className="text-primary" />
            </div>
            <span className="text-2xl font-bold text-label tabular-nums">
              {mapelAjar.length} Mapel
            </span>
            <span className="text-xs text-label-secondary truncate">
              {mapelAjar.map((m) => m.nama).join(', ') || 'Hanya bertugas sebagai Wali'}
            </span>
          </div>
        </div>

        {/* Guidelines for Homeroom Teacher */}
        <section className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col gap-3">
          <h2 className="text-base font-semibold text-label">Tanggung Jawab Wali Kelas</h2>
          <p className="text-sm text-label-secondary leading-relaxed">
            Sebagai wali kelas, Anda bertugas memantau perkembangan belajar peserta didik, mengisi presensi kehadiran (sakit, izin, alfa), mencatat predikat sikap spiritual & sosial, mencatat kegiatan ekstrakurikuler, menentukan keputusan kenaikan kelas, dan mencetak lembar rapor semester resmi berstandar A4.
          </p>
          <div className="pt-1 flex items-center gap-3">
            <Link href="/dashboard/wali" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              <span>Buka Menu Rekap & Wali Sekarang</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // ================= 3. GURU MAPEL VIEW (or Legacy GURU) =================
  if (role === 'GURU_MAPEL' || role === 'GURU') {
    const guruData = profile?.guru;
    const mapelAjar = guruData?.penugasanMapel.length
      ? [...new Map(guruData.penugasanMapel.map((assignment) => [assignment.mapel.id, assignment.mapel])).values()]
      : guruData?.mapel || [];

    return (
      <div className="flex flex-col gap-6">
        
        {/* Guru Banner */}
        <div className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/15 border border-accent/30 text-accent">
                Guru Mata Pelajaran
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label">
              Selamat Datang, {guruData?.nama || 'Bapak/Ibu Guru'}
            </h1>
            <p className="text-sm text-label-secondary mt-1">
              Pengampu Mata Pelajaran SMP Al-Hidayah Medan {guruData?.nip && <span className="font-mono text-xs font-medium ml-2 px-2 py-0.5 rounded bg-fill">NIP: {guruData.nip}</span>}
            </p>
          </div>
          <Link 
            href="/dashboard/nilai"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm"
          >
            <FileSpreadsheet size={16} />
            <span>Mulai Input Nilai</span>
          </Link>
        </div>

        {/* Guru Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-card border border-separator rounded-xl p-5 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between text-label-secondary">
              <span className="text-xs font-semibold uppercase tracking-wider">Mata Pelajaran yang Diampu</span>
              <BookOpen size={18} className="text-accent" />
            </div>
            <span className="text-2xl font-bold text-label tabular-nums">
              {mapelAjar.length} Mata Pelajaran
            </span>
            <span className="text-xs text-label-secondary truncate">
              {mapelAjar.map((m) => m.nama).join(', ') || 'Belum ada mapel ditugaskan'}
            </span>
          </div>

          <div className="bg-card border border-separator rounded-xl p-5 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between text-label-secondary">
              <span className="text-xs font-semibold uppercase tracking-wider">Hak Akses Penilaian</span>
              <ShieldCheck size={18} className="text-primary" />
            </div>
            <span className="text-sm font-semibold text-label">
              Terbatas Pada Mapel & Kelas Penugasan
            </span>
            <span className="text-xs text-label-secondary">
              Sistem RBAC memastikan Anda hanya dapat memasukkan nilai untuk siswa dan mapel yang menjadi wewenang Anda.
            </span>
          </div>
        </div>

        {/* Assigned Subjects Matrix */}
        <section className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-separator pb-3">
            <h2 className="text-base font-semibold text-label">Daftar Penugasan Mengajar Aktif</h2>
            <Link href="/dashboard/nilai" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              <span>Buka Matriks Nilai</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {mapelAjar.length === 0 ? (
            <p className="text-sm text-label-secondary py-4 text-center">
              Belum ada mata pelajaran yang ditugaskan kepada Anda pada tahun ajaran aktif ini. Hubungi administrator sekolah.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mapelAjar.map((mapel) => (
                <div key={mapel.id} className="p-4 rounded-lg border border-separator bg-bg flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-label">{mapel.nama}</h3>
                    <span className="text-xs text-label-secondary font-mono">Standar KKM: {mapel.kkm}</span>
                  </div>
                  <Link 
                    href={`/dashboard/nilai`}
                    className="p-2 rounded-lg hover:bg-card-subtle text-primary transition-colors"
                    title="Input Nilai Mapel Ini"
                  >
                    <ArrowRight size={18} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ================= 4. ORANG TUA VIEW =================
  if (role === 'ORTU') {
    const ortuData = profile?.ortu;
    const anakList = ortuData?.anak || [];

    return (
      <div className="flex flex-col gap-6">
        
        {/* Banner Ortu */}
        <div className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-subtle border border-primary-border text-primary">
                Portal Orang Tua / Wali Murid
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label">
              Selamat Datang, Bapak/Ibu {ortuData?.nama || 'Orang Tua'}
            </h1>
            <p className="text-sm text-label-secondary mt-1">
              Pantau perkembangan akademik putra/putri Anda di SMP Al-Hidayah Medan
              {ortuData?.nik && <span className="font-mono text-xs font-medium ml-2 px-2 py-0.5 rounded bg-fill">NIK: {ortuData.nik}</span>}
            </p>
          </div>
          <Link 
            href="/dashboard/rapor"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Award size={16} />
            <span>Lihat Rapor Anak</span>
          </Link>
        </div>

        {/* Children Cards */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-label">Putra / Putri Terdaftar</h2>
          
          {anakList.length === 0 ? (
            <div className="bg-card border border-separator rounded-xl p-6 text-center text-sm text-label-secondary">
              Belum ada data siswa yang dihubungkan dengan akun Orang Tua ini. Silakan hubungi pihak tata usaha sekolah atau administrator untuk menghubungkan NISN anak Anda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {anakList.map((anak) => (
                <div key={anak.id} className="bg-card border border-separator rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-label-secondary">Peserta Didik</span>
                      <span className="font-mono text-xs bg-fill px-2 py-0.5 rounded border border-separator/60 text-label">
                        NISN: {anak.nisn}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-label mt-1">{anak.nama}</h3>
                    <div className="mt-2 text-xs text-label-secondary flex flex-col gap-1">
                      <span>Kelas: <strong className="text-label">{anak.kelas?.nama ? `Kelas ${anak.kelas.nama}` : 'Belum ditentukan'}</strong></span>
                      <span>Wali Kelas: <strong className="text-label">{anak.kelas?.wali?.nama || '-'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-separator/60">
                    <Link
                      href="/dashboard/rapor"
                      className="flex-1 text-center py-2 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium transition-colors"
                    >
                      Buka Lembar Rapor
                    </Link>
                    <Link
                      href="/dashboard/rapor"
                      className="inline-flex items-center justify-center p-2 rounded-lg border border-separator bg-bg hover:bg-card-subtle text-label text-xs transition-colors"
                      title="Beri Catatan Akhir Semester"
                    >
                      <MessageSquare size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Feature Guide */}
        <section className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <HeartHandshake size={20} className="text-primary" />
            <h2 className="text-base font-semibold text-label">Fitur Catatan Orang Tua di Akhir Semester</h2>
          </div>
          <p className="text-sm text-label-secondary leading-relaxed">
            Pada halaman lembar rapor, orang tua dapat memberikan catatan, tanggapan, dan masukan perkembangan anak untuk setiap semester aktif. Catatan ini akan terdokumentasi langsung pada arsip rapor anak dan dapat dibaca oleh wali kelas serta dewan guru.
          </p>
        </section>
      </div>
    );
  }

  // ================= 5. SISWA VIEW =================
  const siswaData = profile?.siswa;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Student Banner */}
      <div className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-subtle border border-primary-border text-primary">
              Peserta Didik Aktif
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label">
            Halo, {siswaData?.nama || 'Peserta Didik'}
          </h1>
          <p className="text-sm text-label-secondary mt-1">
            Portal Informasi Evaluasi Belajar Peserta Didik SMP Al-Hidayah Medan
            {siswaData?.nisn && <span className="font-mono text-xs font-medium ml-2 px-2 py-0.5 rounded bg-fill">NISN: {siswaData.nisn}</span>}
          </p>
        </div>
        <Link 
          href="/dashboard/rapor"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Award size={16} />
          <span>Buka Rapor Saya</span>
        </Link>
      </div>

      {/* Profil Siswa Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card border border-separator rounded-xl p-5 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs font-semibold uppercase tracking-wider">Kelas Saat Ini</span>
            <School size={18} className="text-primary" />
          </div>
          <span className="text-2xl font-bold text-label">
            {siswaData?.kelas?.nama || 'Belum ada kelas'}
          </span>
          <span className="text-xs text-label-secondary">
            {siswaData?.kelas ? `Tingkat ${siswaData.kelas.tingkat}` : '-'}
          </span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-5 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs font-semibold uppercase tracking-wider">Wali Kelas</span>
            <User size={18} className="text-accent" />
          </div>
          <span className="text-xl font-bold text-label truncate">
            {siswaData?.kelas?.wali?.nama || '-'}
          </span>
          <span className="text-xs text-label-secondary">Pembimbing Akademik Kelas</span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-5 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs font-semibold uppercase tracking-wider">Dokumen Rapor</span>
            <Award size={18} className="text-primary" />
          </div>
          <Link 
            href="/dashboard/rapor"
            className="mt-1 text-center py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm"
          >
            Buka Lembar Rapor
          </Link>
        </div>
      </div>

      {/* Panduan Transparansi Nilai */}
      <section className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col gap-3">
        <h2 className="text-base font-semibold text-label">Transparansi Evaluasi Akademik</h2>
        <p className="text-sm text-label-secondary leading-relaxed">
          Capaian nilai harian/tugas, penilaian tengah semester (UTS), dan penilaian akhir semester (UAS) dihitung secara proporsional. Anda dapat memeriksa ketuntasan batas KKM dan mencetak pratinjau rapor semester resmi berstandar A4.
        </p>
        <div className="pt-2">
          <Link 
            href="/dashboard/rapor" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <span>Buka Rapor Saya Sekarang</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
