// frontend/src/app/dashboard/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  GraduationCap, 
  School, 
  BookOpen, 
  FileSpreadsheet, 
  Award, 
  Calendar, 
  CheckCircle2, 
  TrendingUp,
  User,
  ArrowRight
} from 'lucide-react';

export default function DashboardHome() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ siswa: 0, guru: 0, kelas: 0, mapel: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('siakad_token');
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const resProfile = await fetch('http://localhost:3001/api/auth/me', { headers });
        if (resProfile.ok) {
          const profileData = await resProfile.json();
          setProfile(profileData.user);

          // Jika Admin, ambil statistik sekolah
          if (profileData.user?.role === 'ADMIN') {
            const resStats = await fetch('http://localhost:3001/api/master/stats', { headers });
            if (resStats.ok) setStats(await resStats.json());
          }
        }
      } catch (error) {
        console.error('Gagal mengambil data dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="animate-pulse bg-fill w-28 h-28 rounded-full"></div>
      </div>
    );
  }

  const role = profile?.role || 'ADMIN';

  // ================= ADMIN VIEW =================
  if (role === 'ADMIN') {
    const kpiCards = [
      { label: 'Total Siswa', value: stats.siswa, icon: GraduationCap, color: 'text-accent', href: '/dashboard/siswa' },
      { label: 'Total Guru', value: stats.guru, icon: Users, color: 'text-[var(--green)]', href: '/dashboard/guru' },
      { label: 'Total Kelas', value: stats.kelas, icon: School, color: 'text-[#ff9500]', href: '/dashboard/akademik' },
      { label: 'Mata Pelajaran', value: stats.mapel, icon: BookOpen, color: 'text-[#af52de]', href: '/dashboard/akademik' },
    ];

    return (
      <div className="flex flex-col gap-6">
        <header className="glass rounded-full min-h-[56px] flex items-center justify-between px-6" style={{ '--glass-radius': 'var(--radius-full)' } as React.CSSProperties}>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-label text-[16px]">Portal Administrator E-Rapor SMP Al-Hidayah</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">Aktif</span>
          </div>
          <span className="text-sm text-label-secondary">
            Akun: <strong className="text-label">{profile?.email}</strong>
          </span>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi, idx) => (
            <Link key={idx} href={kpi.href}>
              <div className="glass p-5 flex flex-col gap-3 hover:translate-y-[-2px] transition-transform cursor-pointer" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
                <div className="flex justify-between items-center">
                  <span className="text-[14px] font-medium text-label-secondary">{kpi.label}</span>
                  <div className={`p-2 rounded-full bg-[color-mix(in_srgb,currentColor_12%,transparent)] ${kpi.color}`}>
                    <kpi.icon size={20} strokeWidth={2} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold tabular-nums text-label">{kpi.value}</span>
                  <ArrowRight size={16} className="text-label-tertiary" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Ringkasan & Akses Cepat */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-bg-secondary rounded-[28px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex flex-col gap-4">
            <h3 className="font-semibold text-label text-[17px]">Akses Cepat Pengelolaan</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/guru" className="p-4 rounded-[18px] bg-bg hover:bg-fill transition-colors flex flex-col gap-2">
                <Users size={22} className="text-[var(--green)]" />
                <span className="font-semibold text-sm">Kelola Guru</span>
                <span className="text-xs text-label-secondary">Master data tenaga pendidik</span>
              </Link>
              <Link href="/dashboard/siswa" className="p-4 rounded-[18px] bg-bg hover:bg-fill transition-colors flex flex-col gap-2">
                <GraduationCap size={22} className="text-accent" />
                <span className="font-semibold text-sm">Kelola Siswa</span>
                <span className="text-xs text-label-secondary">Penempatan kelas & NISN SMP</span>
              </Link>
              <Link href="/dashboard/akademik" className="p-4 rounded-[18px] bg-bg hover:bg-fill transition-colors flex flex-col gap-2">
                <School size={22} className="text-[#ff9500]" />
                <span className="font-semibold text-sm">Kelas & Mapel</span>
                <span className="text-xs text-label-secondary">Atur jenjang 7, 8, 9 & wali</span>
              </Link>
              <Link href="/dashboard/wali" className="p-4 rounded-[18px] bg-bg hover:bg-fill transition-colors flex flex-col gap-2">
                <Award size={22} className="text-[#af52de]" />
                <span className="font-semibold text-sm">Rekap & Rapor</span>
                <span className="text-xs text-label-secondary">Catatan wali & cetak rapor</span>
              </Link>
            </div>
          </section>

          <section className="bg-bg-secondary rounded-[28px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-label text-[17px] mb-2">Status Sistem E-Rapor SMP Al-Hidayah</h3>
              <p className="text-sm text-label-secondary leading-relaxed">
                Database PostgreSQL Neon Cloud terhubung. Pengolahan nilai otomatis (Tugas 40%, UTS 30%, UAS 30%) dengan lembar cetak rapor standar A4.
              </p>
            </div>
            <div className="p-4 rounded-[16px] bg-bg flex items-center justify-between mt-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={20} className="text-[var(--green)]" />
                <span className="text-sm font-medium text-label">Koneksi Database Aktif</span>
              </div>
              <span className="text-xs font-semibold text-label-secondary">v1.0.0</span>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ================= GURU VIEW =================
  if (role === 'GURU') {
    const guruData = profile?.guru;
    const kelasWali = guruData?.kelasWali;
    const mapelAjar = guruData?.mapel || [];

    return (
      <div className="flex flex-col gap-6">
        <header className="glass rounded-full min-h-[56px] flex items-center justify-between px-6" style={{ '--glass-radius': 'var(--radius-full)' } as React.CSSProperties}>
          <div>
            <span className="text-sm text-label-secondary">Selamat Datang, </span>
            <strong className="text-label text-[16px]">{guruData?.nama || 'Bapak/Ibu Guru'}</strong>
            {guruData?.nip && <span className="text-xs text-label-tertiary ml-2">NIP: {guruData.nip}</span>}
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-[var(--green)]/15 text-[var(--green)] font-semibold">
            Tenaga Pendidik
          </span>
        </header>

        {/* Kartu Profil Guru */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass p-5 flex flex-col gap-2" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
            <div className="flex items-center justify-between text-label-secondary">
              <span className="text-xs uppercase font-medium">Status Wali Kelas</span>
              <School size={18} className="text-accent" />
            </div>
            <span className="text-2xl font-bold text-label">
              {kelasWali ? kelasWali.nama : 'Bukan Wali'}
            </span>
            <span className="text-xs text-label-secondary">
              {kelasWali ? `Tingkat ${kelasWali.tingkat}` : 'Belum ditugaskan'}
            </span>
          </div>

          <div className="glass p-5 flex flex-col gap-2" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
            <div className="flex items-center justify-between text-label-secondary">
              <span className="text-xs uppercase font-medium">Mapel Diampu</span>
              <BookOpen size={18} className="text-[#af52de]" />
            </div>
            <span className="text-2xl font-bold text-label tabular-nums">
              {mapelAjar.length} Mata Pelajaran
            </span>
            <span className="text-xs text-label-secondary truncate">
              {mapelAjar.map((m: any) => m.nama).join(', ') || 'Belum ada mata pelajaran'}
            </span>
          </div>

          <div className="glass p-5 flex flex-col gap-2" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
            <div className="flex items-center justify-between text-label-secondary">
              <span className="text-xs uppercase font-medium">Menu Cepat</span>
              <FileSpreadsheet size={18} className="text-[var(--green)]" />
            </div>
            <div className="flex flex-col gap-2 mt-1">
              <Link 
                href="/dashboard/nilai"
                className="glass glass-accent text-center py-1.5 px-3 rounded-full text-white text-xs font-semibold active:scale-95 transition-transform"
              >
                Input Nilai Mapel
              </Link>
              {kelasWali && (
                <Link 
                  href="/dashboard/wali"
                  className="bg-fill hover:bg-label/10 text-center py-1.5 px-3 rounded-full text-label text-xs font-semibold active:scale-95 transition-transform"
                >
                  Rekap & Rapor Kelas ({kelasWali.nama})
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Informasi Penugasan */}
        <section className="bg-bg-secondary rounded-[28px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex flex-col gap-4">
          <h3 className="font-semibold text-label text-[17px]">Daftar Mata Pelajaran yang Anda Ampu</h3>
          {mapelAjar.length === 0 ? (
            <p className="text-sm text-label-secondary italic">Belum ada mata pelajaran yang ditugaskan kepada Anda. Hubungi Administrator untuk pengaturan.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mapelAjar.map((m: any) => (
                <div key={m.id} className="p-4 rounded-[18px] bg-bg flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-label">{m.nama}</h4>
                    <span className="text-xs text-label-secondary">KKM Standar: {m.kkm}</span>
                  </div>
                  <Link 
                    href="/dashboard/nilai"
                    className="p-2 rounded-full hover:bg-fill text-accent transition-colors"
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

  // ================= SISWA / ORTU VIEW =================
  const siswaData = role === 'SISWA' ? profile?.siswa : profile?.ortu?.anak?.[0];
  const namaSubjek = role === 'SISWA' ? siswaData?.nama : profile?.ortu?.nama;

  return (
    <div className="flex flex-col gap-6">
      <header className="glass rounded-full min-h-[56px] flex items-center justify-between px-6" style={{ '--glass-radius': 'var(--radius-full)' } as React.CSSProperties}>
        <div>
          <span className="text-sm text-label-secondary">Halo, </span>
          <strong className="text-label text-[16px]">{namaSubjek || 'Peserta Didik'}</strong>
          {siswaData?.nisn && <span className="text-xs text-label-tertiary ml-2">NISN: {siswaData.nisn}</span>}
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-accent/15 text-accent font-semibold uppercase">
          {role}
        </span>
      </header>

      {/* Profil Siswa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-5 flex flex-col gap-2" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs uppercase font-medium">Kelas Saat Ini</span>
            <School size={18} className="text-accent" />
          </div>
          <span className="text-2xl font-bold text-label">
            {siswaData?.kelas?.nama || 'Belum ada kelas'}
          </span>
          <span className="text-xs text-label-secondary">
            {siswaData?.kelas ? `Tingkat ${siswaData.kelas.tingkat}` : '-'}
          </span>
        </div>

        <div className="glass p-5 flex flex-col gap-2" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs uppercase font-medium">Wali Kelas</span>
            <User size={18} className="text-[var(--green)]" />
          </div>
          <span className="text-xl font-bold text-label truncate">
            {siswaData?.kelas?.wali?.nama || '-'}
          </span>
          <span className="text-xs text-label-secondary">Pembimbing Akademik</span>
        </div>

        <div className="glass p-5 flex flex-col gap-2" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs uppercase font-medium">Laporan Nilai</span>
            <Award size={18} className="text-[#ff9500]" />
          </div>
          <Link 
            href="/dashboard/rapor"
            className="mt-1 glass glass-accent text-center py-2 px-4 rounded-full text-white text-sm font-semibold active:scale-95 transition-transform"
          >
            Lihat Rapor Akademik
          </Link>
        </div>
      </div>

      {/* Panduan Siswa */}
      <section className="bg-bg-secondary rounded-[28px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex flex-col gap-4">
        <h3 className="font-semibold text-label text-[17px]">Informasi Evaluasi Akademik</h3>
        <p className="text-sm text-label-secondary leading-relaxed">
          Anda dapat memantau capaian nilai tugas, ujian tengah semester (UTS), dan ujian akhir semester (UAS) secara transparan pada menu <strong>Rapor Saya</strong>. Standar kelulusan ditentukan berdasarkan nilai KKM setiap mata pelajaran.
        </p>
        <div className="pt-2">
          <Link 
            href="/dashboard/rapor" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
          >
            Buka Rapor Saya Sekarang <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}