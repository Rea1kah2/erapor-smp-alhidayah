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
  User, 
  ArrowRight, 
  ShieldCheck, 
  HeartHandshake, 
  Calendar 
} from 'lucide-react';
import { useAcademicYear } from "@/lib/AcademicYearContext";

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
  const { semester, tahunAjaran } = useAcademicYear();
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
      { label: 'Tenaga Pendidik', value: stats.guru, icon: Users, href: '/dashboard/manajemen?tab=guru_mapel', desc: 'Guru Mapel & Wali' },
      { label: 'Kelas', value: stats.kelas, icon: School, href: '/dashboard/manajemen?tab=struktur', desc: 'Kelas tingkat 7, 8, 9' },
      { label: 'Mata Pelajaran', value: stats.mapel, icon: BookOpen, href: '/dashboard/manajemen?tab=struktur', desc: 'Kurikulum standar KKM' },
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
              Sistem Aktif ({tahunAjaran || 'T.A. Berjalan'})
            </span>
          </div>
        </div>

        {/* KPI Cards */}
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
            <h2 className="text-base font-semibold text-label">Pusat Manajemen Terpadu</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/manajemen?tab=users" className="p-3.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle transition-colors flex flex-col gap-1.5">
                <ShieldCheck size={20} className="text-accent" />
                <span className="font-semibold text-sm text-label">Daftar Akun</span>
                <span className="text-xs text-label-secondary">Reset password & kontrol</span>
              </Link>
              <Link href="/dashboard/manajemen?tab=struktur" className="p-3.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle transition-colors flex flex-col gap-1.5">
                <School size={20} className="text-primary" />
                <span className="font-semibold text-sm text-label">Kelas & Mapel</span>
                <span className="text-xs text-label-secondary">Atur kelas & KKM mapel</span>
              </Link>
              <Link href="/dashboard/manajemen?tab=penugasan" className="p-3.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle transition-colors flex flex-col gap-1.5">
                <Calendar size={20} className="text-primary" />
                <span className="font-semibold text-sm text-label">Penugasan & TA</span>
                <span className="text-xs text-label-secondary">Wali & penempatan siswa</span>
              </Link>
              <Link href="/dashboard/siswa" className="p-3.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle transition-colors flex flex-col gap-1.5">
                <GraduationCap size={20} className="text-accent" />
                <span className="font-semibold text-sm text-label">Data Siswa</span>
                <span className="text-xs text-label-secondary">Daftar siswa & tautan ortu</span>
              </Link>
            </div>
          </section>

          <section className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-label mb-2">Integritas Standar Penilaian</h2>
              <p className="text-sm text-label-secondary leading-relaxed">
                Kalkulasi Nilai Akhir (NA) siswa menggunakan formula baku Kemendikbudristek: <strong>Tugas (40%) + UTS (30%) + UAS (30%)</strong> dengan standar ambang KKM default 75.0. Seluruh rekaman nilai dan catatan rapor otomatis terikat ke tahun ajaran aktif.
              </p>
            </div>
            <div className="pt-3 border-t border-separator/60 flex items-center justify-between text-xs text-label-secondary">
              <span>Sistem terhubung ke Neon PostgreSQL</span>
              <span className="font-semibold text-primary">Tahun Aktif: {tahunAjaran || '-'}</span>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ================= 2. WALI KELAS VIEW =================
  if (role === 'GURU_WALI') {
    const guruData = profile?.guru;
    const kelasWali = guruData?.kelasWali || guruData?.penugasanWali?.[0]?.kelas;

    return (
      <div className="flex flex-col gap-6">
        
        {/* Banner Wali */}
        <div className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                Wali Kelas {kelasWali?.nama || ''}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label">
              Selamat Bertugas, {guruData?.nama || 'Bapak/Ibu Guru'}
            </h1>
            <p className="text-sm text-label-secondary mt-1">
              Pembimbing Akademik Kelas {kelasWali?.nama || 'Binaan'} &bull; Semester {semester} &bull; T.A. {tahunAjaran}
            </p>
          </div>
          <Link 
            href="/dashboard/wali"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Award size={16} />
            <span>Buka Rekap & Cetak Rapor</span>
          </Link>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/dashboard/wali" className="bg-card hover:bg-card-subtle border border-separator rounded-xl p-5 shadow-sm transition-colors flex flex-col justify-between gap-3 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-label-secondary uppercase tracking-wider">Tugas Wali Kelas</span>
              <Award size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-label group-hover:text-primary transition-colors">
                Rekapitulasi Nilai & Leger Kelas
              </h3>
              <p className="text-xs text-label-secondary mt-1 leading-relaxed">
                Pantau akumulasi nilai seluruh mata pelajaran, input presensi siswa, catatan sikap, dan cetak lembar rapor A4 resmi.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mt-1">
              <span>Buka Panel Leger & Rapor</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          <Link href="/dashboard/nilai" className="bg-card hover:bg-card-subtle border border-separator rounded-xl p-5 shadow-sm transition-colors flex flex-col justify-between gap-3 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-label-secondary uppercase tracking-wider">Tugas Mengajar</span>
              <FileSpreadsheet size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="text-base font-bold text-label group-hover:text-primary transition-colors">
                Input Nilai Mata Pelajaran
              </h3>
              <p className="text-xs text-label-secondary mt-1 leading-relaxed">
                Input nilai Tugas (40%), UTS (30%), dan UAS (30%) untuk mata pelajaran yang Anda ampu di kelas binaan maupun kelas lainnya.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mt-1">
              <span>Buka Matriks Input Nilai</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        </div>
      </div>
    );
  }

  // ================= 3. GURU MAPEL VIEW =================
  if (role === 'GURU' || role === 'GURU_MAPEL') {
    const guruData = profile?.guru;
    const mapelAjar = guruData?.mapel || [];

    return (
      <div className="flex flex-col gap-6">
        
        {/* Banner Guru */}
        <div className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-subtle border border-primary-border text-primary">
                Tenaga Pendidik
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label">
              Selamat Datang, {guruData?.nama || 'Bapak/Ibu Guru'}
            </h1>
            <p className="text-sm text-label-secondary mt-1">
              Portal Penginputan Nilai Peserta Didik SMP Al-Hidayah Medan &bull; T.A. {tahunAjaran}
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

        {/* Subjects Handled */}
        <section className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-separator/60 pb-3">
            <div>
              <h2 className="text-base font-semibold text-label">Mata Pelajaran yang Diampu</h2>
              <p className="text-xs text-label-secondary">Klik mapel untuk langsung mengisi penilaian Tugas, UTS, dan UAS</p>
            </div>
            <Link href="/dashboard/nilai" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              <span>Buka Spreadsheet Nilai</span>
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
                <Link
                  key={mapel.id}
                  href="/dashboard/nilai"
                  className="p-4 rounded-xl border border-separator bg-bg hover:bg-card-subtle flex items-center justify-between transition-colors group cursor-pointer"
                >
                  <div>
                    <h3 className="font-semibold text-sm text-label group-hover:text-primary transition-colors">{mapel.nama}</h3>
                    <span className="text-xs text-label-secondary font-mono">Standar KKM: {mapel.kkm}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-primary-subtle text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <ArrowRight size={16} />
                  </div>
                </Link>
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
              Pantau perkembangan akademik putra/putri Anda secara transparan di SMP Al-Hidayah Medan
            </p>
          </div>
          {anakList[0] && (
            <Link 
              href={`/dashboard/rapor?siswaId=${anakList[0].id}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm"
            >
              <Award size={16} />
              <span>Buka Rapor {anakList[0].nama.split(' ')[0]}</span>
            </Link>
          )}
        </div>

        {/* Children Actionable Cards */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-label">Putra / Putri Terdaftar ({anakList.length} Siswa)</h2>
          
          {anakList.length === 0 ? (
            <div className="bg-card border border-separator rounded-xl p-6 text-center text-sm text-label-secondary">
              Belum ada data siswa yang dihubungkan dengan akun Orang Tua ini. Silakan hubungi pihak tata usaha sekolah atau administrator untuk menautkan NISN anak Anda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {anakList.map((anak) => (
                <div key={anak.id} className="bg-card border border-separator rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-subtle border border-primary-border text-primary font-bold text-base flex items-center justify-center shrink-0">
                      {anak.nama.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs bg-fill px-2 py-0.5 rounded border border-separator/60 text-label">
                          NISN: {anak.nisn}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-label truncate mt-1">{anak.nama}</h3>
                      <div className="mt-1 text-xs text-label-secondary flex flex-col gap-0.5">
                        <span>Kelas: <strong className="text-label">{anak.kelas?.nama ? `Kelas ${anak.kelas.nama}` : 'Belum ditentukan'}</strong></span>
                        <span>Wali Kelas: <strong className="text-label">{anak.kelas?.wali?.nama || '-'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-separator/60">
                    <Link
                      href={`/dashboard/rapor?siswaId=${anak.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors shadow-xs"
                    >
                      <Award size={14} />
                      <span>Lihat Rapor {anak.nama.split(' ')[0]}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Feature Guide */}
        <section className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <HeartHandshake size={20} className="text-primary" />
            <h2 className="text-base font-semibold text-label">Fitur Catatan & Tanggapan Orang Tua</h2>
          </div>
          <p className="text-sm text-label-secondary leading-relaxed">
            Pada halaman lembar rapor, Anda dapat membaca evaluasi ketuntasan tiap mata pelajaran serta menuliskan catatan atau pesan bimbingan untuk wali kelas dan dewan guru di akhir semester.
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
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <Award size={18} />
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
            {siswaData?.kelas ? `Tingkat ${siswaData.kelas.tingkat} SMP Al-Hidayah` : '-'}
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
            <span className="text-xs font-semibold uppercase tracking-wider">Tahun Akademik</span>
            <Calendar size={18} className="text-primary" />
          </div>
          <span className="text-xl font-bold text-label font-mono">
            {tahunAjaran || '-'}
          </span>
          <span className="text-xs text-label-secondary">
            Semester {semester === 'GANJIL' ? 'Ganjil' : 'Genap'}
          </span>
        </div>
      </div>

      {/* Panduan Transparansi Nilai */}
      <section className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col gap-2">
        <h2 className="text-base font-semibold text-label">Transparansi Evaluasi Akademik</h2>
        <p className="text-sm text-label-secondary leading-relaxed">
          Capaian nilai harian/tugas, penilaian tengah semester (UTS), dan penilaian akhir semester (UAS) dihitung secara proporsional sesuai standar dinas pendidikan. Anda dapat memeriksa ketuntasan KKM dan mencetak pratinjau rapor semester resmi berstandar A4.
        </p>
      </section>
    </div>
  );
}
