// frontend/src/app/dashboard/page.tsx
'use client';
import { apiFetch } from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  GraduationCap,
  HeartHandshake,
  School,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAcademicYear } from '@/lib/AcademicYearContext';

interface SubjectSummary {
  id: string;
  nama: string;
  kkm: number;
}

interface TaughtSubject extends SubjectSummary {
  kelasNames: string[];
}

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
  siswa?: {
    nama: string;
    nisn: string;
    kelas: { nama: string; tingkat: number; wali?: { nama: string } | null } | null;
  } | null;
  ortu?: {
    nama: string;
    nik?: string;
    anak: Array<{
      id: string;
      nama: string;
      nisn: string;
      kelas: { nama: string; tingkat: number; wali?: { nama: string } | null } | null;
    }>;
  } | null;
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
      <div className="flex flex-col gap-6">
        <div className="h-20 rounded-xl bg-fill border border-separator" />
        <div className="h-28 rounded-xl bg-fill border border-separator" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 rounded-xl bg-fill border border-separator" />
          <div className="h-44 rounded-xl bg-fill border border-separator" />
        </div>
      </div>
    );
  }

  const role = profile?.role || 'ADMIN';
  const semesterLabel = semester === 'GANJIL' ? 'Ganjil' : 'Genap';

  // ================= 1. ADMIN VIEW =================
  if (role === 'ADMIN') {
    const kpiItems = [
      { label: 'Peserta didik', value: stats.siswa, href: '/dashboard/siswa', desc: 'Siswa aktif terdaftar' },
      { label: 'Tenaga pendidik', value: stats.guru, href: '/dashboard/manajemen?tab=guru_mapel', desc: 'Guru mapel dan wali' },
      { label: 'Rombongan belajar', value: stats.kelas, href: '/dashboard/manajemen?tab=struktur', desc: 'Kelas tingkat 7, 8, 9' },
      { label: 'Mata pelajaran', value: stats.mapel, href: '/dashboard/manajemen?tab=struktur', desc: 'Kurikulum standar KKM' },
    ];

    return (
      <div className="flex flex-col gap-6">
        {/* Header Band */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-separator">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-label">
              Portal Administrasi Akademik
            </h1>
            <p className="text-sm text-label-secondary mt-1">
              SMP Al-Hidayah Medan &middot; {profile?.email} &middot; Tahun Ajaran{' '}
              <span className="font-id font-medium text-label">{tahunAjaran || '-'}</span> ({semesterLabel})
            </p>
          </div>
          <Link
            href="/dashboard/manajemen"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shrink-0"
          >
            <Users size={16} />
            <span>Kelola Akademik</span>
          </Link>
        </div>

        {/* KPI Typographic Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-separator border border-separator rounded-xl overflow-hidden">
          {kpiItems.map((kpi) => (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="bg-card hover:bg-card-subtle p-4 sm:p-5 flex flex-col gap-1.5 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-label-secondary truncate">{kpi.label}</span>
                <ArrowRight size={14} className="text-label-tertiary group-hover:text-primary transition-colors shrink-0" />
              </div>
              <span className="text-2xl sm:text-[28px] leading-tight font-semibold num-tabular text-label">
                {kpi.value}
              </span>
              <span className="text-xs text-label-secondary line-clamp-1">{kpi.desc}</span>
            </Link>
          ))}
        </div>

        {/* Workspace Modules & Assessment Rules */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-card rounded-xl border border-separator p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-label">Pusat Manajemen</h2>
              <span className="text-xs text-label-secondary">Akses cepat modul master</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/dashboard/manajemen?tab=users"
                className="p-3.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle transition-colors flex items-start gap-3"
              >
                <ShieldCheck size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-sm text-label">Daftar Akun</div>
                  <div className="text-xs text-label-secondary mt-0.5">Kontrol akses dan reset password</div>
                </div>
              </Link>
              <Link
                href="/dashboard/manajemen?tab=struktur"
                className="p-3.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle transition-colors flex items-start gap-3"
              >
                <School size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-sm text-label">Kelas & Mata Pelajaran</div>
                  <div className="text-xs text-label-secondary mt-0.5">Pengaturan kelas dan KKM mapel</div>
                </div>
              </Link>
              <Link
                href="/dashboard/manajemen?tab=penugasan"
                className="p-3.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle transition-colors flex items-start gap-3"
              >
                <Calendar size={18} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-sm text-label">Tahun Ajaran & Penugasan</div>
                  <div className="text-xs text-label-secondary mt-0.5">Wali kelas dan penempatan siswa</div>
                </div>
              </Link>
              <Link
                href="/dashboard/siswa"
                className="p-3.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle transition-colors flex items-start gap-3"
              >
                <GraduationCap size={18} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-sm text-label">Data Siswa & Orang Tua</div>
                  <div className="text-xs text-label-secondary mt-0.5">Buku induk siswa dan akun wali murid</div>
                </div>
              </Link>
            </div>
          </section>

          <section className="bg-card rounded-xl border border-separator p-5 flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-label mb-2">Standar Kalkulasi Rapor</h2>
              <p className="text-sm text-label-secondary leading-relaxed">
                Nilai Akhir (NA) dihitung otomatis dari bobot <strong className="text-label">Tugas 40%</strong>,{' '}
                <strong className="text-label">UTS 30%</strong>, dan <strong className="text-label">UAS 30%</strong> dengan ambang KKM bawaan 75.
              </p>
            </div>
            <div className="pt-3 border-t border-separator flex items-center justify-between text-xs text-label-secondary">
              <span>Periode aktif</span>
              <span className="font-id font-medium text-primary">
                {tahunAjaran || '-'} &middot; {semesterLabel}
              </span>
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
        {/* Header Band */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-separator">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mb-1.5">
              <span>Wali Kelas {kelasWali?.nama || 'Binaan'}</span>
              {guruData?.nip && (
                <>
                  <span>&middot;</span>
                  <span className="font-id text-label-secondary">NIP {guruData.nip}</span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-label">
              Selamat Bertugas, {guruData?.nama || 'Bapak/Ibu Guru'}
            </h1>
            <p className="text-sm text-label-secondary mt-1">
              Pembimbing akademik Kelas {kelasWali?.nama || '-'} &middot; Semester {semesterLabel} &middot;{' '}
              <span className="font-id">{tahunAjaran || '-'}</span>
            </p>
          </div>
          <Link
            href="/dashboard/wali"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shrink-0"
          >
            <Award size={16} />
            <span>Buka Leger & Rapor</span>
          </Link>
        </div>

        {/* Divided Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-separator border border-separator rounded-xl overflow-hidden">
          <Link
            href="/dashboard/wali"
            className="bg-card hover:bg-card-subtle p-5 sm:p-6 transition-colors flex flex-col justify-between gap-4 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-label-secondary">Tugas wali kelas</span>
              <Award size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-label group-hover:text-primary transition-colors">
                Rekapitulasi Nilai & Leger Kelas
              </h3>
              <p className="text-sm text-label-secondary mt-1 leading-relaxed">
                Pantau rekap nilai seluruh mata pelajaran, isi presensi (sakit, izin, alfa), sikap siswa, dan cetak rapor A4 resmi.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <span>Buka panel wali kelas</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            href="/dashboard/nilai"
            className="bg-card hover:bg-card-subtle p-5 sm:p-6 transition-colors flex flex-col justify-between gap-4 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-label-secondary">Tugas mengajar</span>
              <FileSpreadsheet size={18} className="text-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-label group-hover:text-primary transition-colors">
                Input Nilai Mata Pelajaran
              </h3>
              <p className="text-sm text-label-secondary mt-1 leading-relaxed">
                Isi nilai Tugas (40%), UTS (30%), dan UAS (30%) untuk mata pelajaran yang Anda ampu pada tahun ajaran aktif.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <span>Buka matriks penilaian</span>
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
    const mapelMap = new Map<string, TaughtSubject>();

    for (const item of guruData?.penugasanMapel || []) {
      const existing = mapelMap.get(item.mapel.id);
      if (existing) {
        if (!existing.kelasNames.includes(item.kelas.nama)) {
          existing.kelasNames.push(item.kelas.nama);
        }
      } else {
        mapelMap.set(item.mapel.id, {
          ...item.mapel,
          kelasNames: [item.kelas.nama],
        });
      }
    }

    for (const m of guruData?.mapel || []) {
      if (!mapelMap.has(m.id)) {
        mapelMap.set(m.id, { ...m, kelasNames: [] });
      }
    }

    const mapelAjar = Array.from(mapelMap.values());

    return (
      <div className="flex flex-col gap-6">
        {/* Header Band */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-separator">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mb-1.5">
              <span>Tenaga Pendidik</span>
              {guruData?.nip && (
                <>
                  <span>&middot;</span>
                  <span className="font-id text-label-secondary">NIP {guruData.nip}</span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-label">
              Selamat Datang, {guruData?.nama || 'Bapak/Ibu Guru'}
            </h1>
            <p className="text-sm text-label-secondary mt-1">
              Penilaian Mata Pelajaran SMP Al-Hidayah Medan &middot; Semester {semesterLabel} &middot;{' '}
              <span className="font-id">{tahunAjaran || '-'}</span>
            </p>
          </div>
          <Link
            href="/dashboard/nilai"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shrink-0"
          >
            <FileSpreadsheet size={16} />
            <span>Mulai Input Nilai</span>
          </Link>
        </div>

        {/* Subjects Handled */}
        <section className="bg-card rounded-xl border border-separator p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-separator pb-3">
            <div>
              <h2 className="text-base font-semibold text-label">Mata Pelajaran yang Diampu</h2>
              <p className="text-xs text-label-secondary mt-0.5">
                Klik mata pelajaran untuk mengisi nilai Tugas, UTS, dan UAS siswa
              </p>
            </div>
            <Link href="/dashboard/nilai" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              <span>Matriks nilai</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {mapelAjar.length === 0 ? (
            <div className="py-8 text-center text-sm text-label-secondary">
              Belum ada mata pelajaran yang ditugaskan kepada Anda pada tahun ajaran aktif ini. Hubungi administrator sekolah.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mapelAjar.map((mapel) => (
                <Link
                  key={mapel.id}
                  href="/dashboard/nilai"
                  className="p-4 rounded-xl border border-separator bg-bg hover:bg-card-subtle flex items-start justify-between gap-3 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm text-label group-hover:text-primary transition-colors truncate">
                      {mapel.nama}
                    </h3>
                    <div className="text-xs text-label-secondary mt-1 num-tabular">
                      KKM standar: <span className="font-medium text-label">{mapel.kkm}</span>
                    </div>
                    {mapel.kelasNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {mapel.kelasNames.map((kls) => (
                          <span
                            key={kls}
                            className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary-subtle text-primary border border-primary-border"
                          >
                            Kelas {kls}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ArrowRight size={16} className="text-label-tertiary group-hover:text-primary transition-colors mt-0.5 shrink-0" />
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
        {/* Header Band */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-separator">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mb-1.5">
              <span>Portal Orang Tua & Wali Murid</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-label">
              Selamat Datang, Bapak/Ibu {ortuData?.nama || 'Orang Tua'}
            </h1>
            <p className="text-sm text-label-secondary mt-1">
              Pantau capaian belajar putra/putri Anda di SMP Al-Hidayah Medan &middot;{' '}
              <span className="font-id">{tahunAjaran || '-'}</span> ({semesterLabel})
            </p>
          </div>
          {anakList[0] && (
            <Link
              href={`/dashboard/rapor?siswaId=${anakList[0].id}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shrink-0"
            >
              <Award size={16} />
              <span>Buka Rapor {anakList[0].nama.split(' ')[0]}</span>
            </Link>
          )}
        </div>

        {/* Registered Children */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-label">Putra / Putri Terdaftar ({anakList.length})</h2>

          {anakList.length === 0 ? (
            <div className="bg-card border border-separator rounded-xl p-6 text-center text-sm text-label-secondary">
              Belum ada data siswa yang ditautkan ke akun Anda. Hubungi tata usaha sekolah untuk menautkan NISN anak.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {anakList.map((anak) => (
                <div
                  key={anak.id}
                  className="bg-card border border-separator rounded-xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-id text-xs bg-fill px-2 py-0.5 rounded border border-separator text-label-secondary">
                        NISN {anak.nisn}
                      </span>
                      <h3 className="text-base font-semibold text-label truncate mt-2">{anak.nama}</h3>
                      <div className="mt-1.5 text-xs text-label-secondary flex flex-col gap-0.5">
                        <span>
                          Kelas: <strong className="text-label">{anak.kelas?.nama ? `Kelas ${anak.kelas.nama}` : 'Belum ditentukan'}</strong>
                        </span>
                        <span>
                          Wali kelas: <strong className="text-label">{anak.kelas?.wali?.nama || '-'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-separator">
                    <Link
                      href={`/dashboard/rapor?siswaId=${anak.id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium transition-colors"
                    >
                      <Award size={14} />
                      <span>Lihat Lembar Rapor</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-card rounded-xl border border-separator p-5 flex items-start gap-3">
          <HeartHandshake size={18} className="text-primary mt-0.5 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-label">Catatan & Tanggapan Orang Tua</h2>
            <p className="text-sm text-label-secondary mt-1 leading-relaxed">
              Pada lembar rapor semester, Anda dapat meninjau ketuntasan tiap mata pelajaran dan menuliskan catatan atau masukan bagi wali kelas.
            </p>
          </div>
        </section>
      </div>
    );
  }

  // ================= 5. SISWA VIEW =================
  const siswaData = profile?.siswa;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Band */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-separator">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mb-1.5">
            <span>Peserta Didik Aktif</span>
            {siswaData?.nisn && (
              <>
                <span>&middot;</span>
                <span className="font-id text-label-secondary">NISN {siswaData.nisn}</span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-label">
            Halo, {siswaData?.nama || 'Peserta Didik'}
          </h1>
          <p className="text-sm text-label-secondary mt-1">
            Portal Evaluasi Belajar SMP Al-Hidayah Medan
          </p>
        </div>
        <Link
          href="/dashboard/rapor"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shrink-0"
        >
          <Award size={16} />
          <span>Buka Rapor Saya</span>
        </Link>
      </div>

      {/* KPI / Student Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-separator border border-separator rounded-xl overflow-hidden">
        <div className="bg-card p-4 sm:p-5 flex flex-col gap-1">
          <span className="text-[13px] font-medium text-label-secondary">Kelas saat ini</span>
          <span className="text-xl sm:text-2xl font-semibold text-label">
            {siswaData?.kelas?.nama || 'Belum ditentukan'}
          </span>
          <span className="text-xs text-label-secondary">
            {siswaData?.kelas ? `Tingkat ${siswaData.kelas.tingkat} SMP Al-Hidayah` : '-'}
          </span>
        </div>

        <div className="bg-card p-4 sm:p-5 flex flex-col gap-1">
          <span className="text-[13px] font-medium text-label-secondary">Wali kelas</span>
          <span className="text-xl sm:text-2xl font-semibold text-label truncate">
            {siswaData?.kelas?.wali?.nama || '-'}
          </span>
          <span className="text-xs text-label-secondary">Pembimbing akademik kelas</span>
        </div>

        <div className="bg-card p-4 sm:p-5 flex flex-col gap-1">
          <span className="text-[13px] font-medium text-label-secondary">Tahun akademik</span>
          <span className="text-xl sm:text-2xl font-semibold text-label font-id">
            {tahunAjaran || '-'}
          </span>
          <span className="text-xs text-label-secondary">Semester {semesterLabel}</span>
        </div>
      </div>

      <section className="bg-card rounded-xl border border-separator p-5 flex items-start gap-3">
        <BookOpen size={18} className="text-primary mt-0.5 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold text-label">Transparansi Evaluasi Akademik</h2>
          <p className="text-sm text-label-secondary mt-1 leading-relaxed">
            Nilai Tugas, UTS, dan UAS dihitung secara proporsional sesuai standar sekolah. Anda dapat melihat status ketuntasan KKM dan mencetak pratinjau rapor A4 resmi.
          </p>
        </div>
      </section>
    </div>
  );
}
