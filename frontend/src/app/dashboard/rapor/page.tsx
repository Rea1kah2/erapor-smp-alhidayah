// frontend/src/app/dashboard/rapor/page.tsx
'use client';
import { apiFetch } from "@/lib/api";
import { errorMessage } from '@/lib/errors';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Inbox, 
  School,
  RefreshCw,
  Printer,
  Heart,
  Smile,
  Activity,
  MessageSquare,
  Send
} from 'lucide-react';
import PrintableRapor, { RaporData } from '../components/PrintableRapor';

interface NilaiItem {
  id: string;
  skor: number;
  jenis: string;
  semester: string;
  tahunAjaran: string;
  mapel: {
    id: string;
    nama: string;
    kkm: number;
    guru?: { nama: string } | null;
  };
  siswa: {
    id: string;
    nama: string;
    nisn: string;
    kelas?: { 
      nama: string;
      tingkat: number;
      wali?: { nama: string; nip?: string | null } | null;
    } | null;
  };
}

interface CatatanRaporItem {
  id?: string;
  siswaId?: string;
  sakit: number;
  izin: number;
  alfa: number;
  sikapSpiritual: string | null;
  deskripsiSpiritual: string | null;
  sikapSosial: string | null;
  deskripsiSosial: string | null;
  ekskul: Array<{ nama: string; predikat: string; keterangan: string }>;
  catatanWali: string;
  catatanOrtu?: string | null;
  catatanOrtuAt?: string | null;
  statusKenaikan?: string | null;
}

export default function RaporSayaPage() {
  const [nilaiList, setNilaiList] = useState<NilaiItem[]>([]);
  const [catatanList, setCatatanList] = useState<CatatanRaporItem[]>([]);
  const [siswaList, setSiswaList] = useState<Array<{ id: string; nama: string; nisn: string }>>([]);
  const [targetSiswaId, setTargetSiswaId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('SISWA');

  // Catatan Ortu States
  const [editedNote, setEditedNote] = useState<string | null>(null);
  const [isSavingOrtuNote, setIsSavingOrtuNote] = useState<boolean>(false);
  const [saveOrtuNoteSuccess, setSaveOrtuNoteSuccess] = useState<string>('');

  const [semester, setSemester] = useState<string>('GANJIL');
  const [tahunAjaran, setTahunAjaran] = useState<string>('');
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Print Preview Modal
  const [printData, setPrintData] = useState<RaporData | null>(null);
  const [isLoadingPrint, setIsLoadingPrint] = useState<boolean>(false);

  // Fetch role
  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(async (res) => {
        if (res.ok) {
          const profile = await res.json();
          setUserRole(profile.user?.role || 'SISWA');
        }
      })
      .catch(() => {});
  }, []);

  const fetchNilaiSaya = useCallback(async () => {
    if (!tahunAjaran) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(
        `/api/nilai/saya?semester=${semester}&tahunAjaran=${encodeURIComponent(tahunAjaran)}`
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengambil data nilai');
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setNilaiList(data);
        if (data[0]?.siswa?.id) setTargetSiswaId(data[0].siswa.id);
      } else {
        const loadedCatatan: CatatanRaporItem[] = data.catatanRaporList || (data.catatanRapor ? [data.catatanRapor] : []);
        setNilaiList(data.nilai || []);
        setCatatanList(loadedCatatan);
        setSiswaList(data.siswaList || []);
        const sId = data.siswaId || data.nilai?.[0]?.siswa?.id || null;
        setTargetSiswaId(sId);

        // Reset parent note draft on new fetch
        setEditedNote(null);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(errorMessage(err, 'Gagal memuat rapor.'));
    } finally {
      setIsLoading(false);
    }
  }, [semester, tahunAjaran]);

  useEffect(() => {
    queueMicrotask(() => { void fetchNilaiSaya(); });
  }, [fetchNilaiSaya]);

  const catatanRapor = catatanList.find((item) => !targetSiswaId || item.siswaId === targetSiswaId) || catatanList[0] || null;
  const currentCatatanOrtu = editedNote !== null ? editedNote : (catatanRapor?.catatanOrtu || '');

  const handleSaveCatatanOrtu = async () => {
    const sId = targetSiswaId || nilaiList[0]?.siswa?.id;
    if (!sId) {
      setErrorMsg('ID Siswa tidak ditemukan.');
      return;
    }
    setIsSavingOrtuNote(true);
    setSaveOrtuNoteSuccess('');
    setErrorMsg('');
    try {
      const res = await apiFetch(`/api/ortu/catatan/${sId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester,
          tahunAjaran,
          catatanOrtu: currentCatatanOrtu
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan catatan orang tua');
      setSaveOrtuNoteSuccess('Catatan orang tua berhasil disimpan ke lembar rapor semester!');
      setEditedNote(null);
      setTimeout(() => setSaveOrtuNoteSuccess(''), 4000);
      await fetchNilaiSaya();
    } catch (err) {
      setErrorMsg(errorMessage(err));
    } finally {
      setIsSavingOrtuNote(false);
    }
  };

  useEffect(() => {
    apiFetch('/api/master/tahun-ajaran')
      .then(async (response) => {
        if (!response.ok) return;
        const years: Array<{ nama: string; aktif: boolean }> = await response.json();
        setYearOptions(years.map((year) => year.nama));
        const activeYear = years.find((year) => year.aktif)?.nama;
        if (activeYear) setTahunAjaran(activeYear);
      })
      .catch(() => setErrorMsg('Gagal memuat daftar tahun ajaran.'));
  }, []);

  // Kelompokkan nilai per mata pelajaran & hitung Nilai Akhir (Tugas 40%, UTS 30%, UAS 30%)
  const groupedByMapel = useMemo(() => {
    const map = new Map<string, {
      mapel: NilaiItem['mapel'];
      scores: Record<string, number>;
    }>();

    nilaiList.filter((item) => !targetSiswaId || item.siswa.id === targetSiswaId).forEach((item) => {
      if (!map.has(item.mapel.id)) {
        map.set(item.mapel.id, {
          mapel: item.mapel,
          scores: {},
        });
      }
      map.get(item.mapel.id)!.scores[item.jenis] = item.skor;
    });

    return Array.from(map.values()).map(({ mapel, scores }) => {
      const tugas = scores.TUGAS !== undefined ? scores.TUGAS : null;
      const uts = scores.UTS !== undefined ? scores.UTS : null;
      const uas = scores.UAS !== undefined ? scores.UAS : null;

      let finalScore: number | null = null;
      let totalBobot = 0;
      let akumulasi = 0;

      if (tugas !== null) { akumulasi += tugas * 0.4; totalBobot += 0.4; }
      if (uts !== null) { akumulasi += uts * 0.3; totalBobot += 0.3; }
      if (uas !== null) { akumulasi += uas * 0.3; totalBobot += 0.3; }

      if (totalBobot > 0) {
        finalScore = Math.round((akumulasi / totalBobot) * 10) / 10;
      }

      let predikat = '-';
      if (finalScore !== null) {
        if (finalScore >= 90) predikat = 'A';
        else if (finalScore >= 80) predikat = 'B';
        else if (finalScore >= mapel.kkm) predikat = 'C';
        else predikat = 'D';
      }

      const passed = finalScore !== null ? finalScore >= mapel.kkm : false;

      return {
        mapel,
        tugas,
        uts,
        uas,
        finalScore,
        predikat,
        passed,
      };
    });
  }, [nilaiList, targetSiswaId]);

  // Statistik Rapor
  const stats = useMemo(() => {
    const totalMapel = groupedByMapel.length;
    let sumScore = 0;
    let scoredCount = 0;
    let tuntasCount = 0;

    groupedByMapel.forEach((item) => {
      if (item.finalScore !== null) {
        sumScore += item.finalScore;
        scoredCount++;
        if (item.passed) tuntasCount++;
      }
    });

    const ipk = scoredCount > 0 ? (sumScore / scoredCount).toFixed(1) : '0';

    return {
      totalMapel,
      scoredCount,
      rataRata: ipk,
      tuntasCount,
    };
  }, [groupedByMapel]);

  const siswaInfo = nilaiList[0]?.siswa;

  const handlePrintRapor = async () => {
    const sId = targetSiswaId || siswaInfo?.id;
    if (!sId) {
      alert('Data siswa belum tersedia untuk dicetak');
      return;
    }

    setIsLoadingPrint(true);
    try {
      const res = await apiFetch(`/api/wali/rapor/${sId}?semester=${semester}&tahunAjaran=${encodeURIComponent(tahunAjaran)}`);
      if (!res.ok) throw new Error('Gagal mengambil data lembar rapor siswa');
      const data = await res.json();
      setPrintData(data);
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal memuat pratinjau rapor.'));
    } finally {
      setIsLoadingPrint(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label flex items-center gap-2">
            <Award className="text-primary" size={24} />
            <span>Transparansi Hasil Belajar & Rapor</span>
          </h1>
          <p className="text-xs sm:text-sm text-label-secondary mt-0.5">
            Laporan evaluasi capaian kompetensi nilai akademik dan presensi peserta didik
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {siswaList.length > 1 && (
            <select 
              value={targetSiswaId || ''} 
              onChange={(e) => setTargetSiswaId(e.target.value)} 
              className="h-9 px-3 rounded-lg bg-card border border-separator text-label text-xs font-semibold focus:border-primary outline-none cursor-pointer"
            >
              {siswaList.map((siswa) => (
                <option key={siswa.id} value={siswa.id}>
                  {siswa.nama} ({siswa.nisn})
                </option>
              ))}
            </select>
          )}

          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="h-9 px-3 rounded-lg bg-card border border-separator text-label text-xs font-semibold focus:border-primary outline-none cursor-pointer"
          >
            <option value="GANJIL">Semester Ganjil</option>
            <option value="GENAP">Semester Genap</option>
          </select>

          <select
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            className="h-9 px-3 rounded-lg bg-card border border-separator text-label text-xs font-semibold focus:border-primary outline-none cursor-pointer"
          >
            {yearOptions.map((year) => <option key={year} value={year}>T.A. {year}</option>)}
          </select>

          <button
            onClick={handlePrintRapor}
            disabled={isLoadingPrint || groupedByMapel.length === 0}
            className="h-9 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Printer size={15} />
            <span>{isLoadingPrint ? 'Menyiapkan...' : 'Cetak Rapor A4'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg flex items-center gap-2.5 bg-[var(--status-fail-bg)] text-[var(--status-fail)] border border-[var(--status-fail-border)] text-xs font-medium">
          <AlertCircle size={16} className="shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* KPI Cards Ringkasan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Rata-Rata Nilai</span>
            <TrendingUp size={14} className="text-accent" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-label">{stats.rataRata}</span>
          <span className="text-[11px] text-label-secondary">Skala Penilaian 0-100</span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Ketuntasan KKM</span>
            <CheckCircle2 size={14} className="text-primary" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-label">
            {stats.tuntasCount} <span className="text-sm font-normal text-label-secondary">/ {stats.scoredCount}</span>
          </span>
          <span className="text-[11px] text-label-secondary">Mata Pelajaran Tuntas</span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Kehadiran (Presensi)</span>
            <Activity size={14} className="text-accent" />
          </div>
          <span className="text-lg font-bold font-mono text-label mt-0.5">
            {catatanRapor ? `${catatanRapor.sakit}S / ${catatanRapor.izin}I / ${catatanRapor.alfa}A` : '-'}
          </span>
          <span className="text-[11px] text-label-secondary">Sakit / Izin / Alfa</span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Status Evaluasi</span>
            <School size={14} className="text-primary" />
          </div>
          <span className="text-sm font-bold text-label mt-1 truncate">
            {stats.scoredCount === 0 ? 'Belum Dievaluasi' : stats.tuntasCount === stats.scoredCount ? 'Tuntas Seluruh KKM' : 'Perlu Remedial'}
          </span>
          <span className="text-[11px] text-label-secondary">Standar SMP Al-Hidayah</span>
        </div>
      </div>

      {/* Tabel Capaian Akademik Rinci */}
      <section className="bg-card rounded-xl border border-separator shadow-sm overflow-hidden flex flex-col">
        <div className="p-3.5 sm:p-4 flex items-center justify-between border-b border-separator bg-bg/50">
          <div>
            <h2 className="text-sm font-semibold text-label">Rincian Capaian Mata Pelajaran</h2>
            {siswaInfo && (
              <p className="text-xs text-label-secondary mt-0.5">
                Peserta Didik: <strong className="text-label">{siswaInfo.nama}</strong> ({siswaInfo.nisn}) &bull; Kelas: {siswaInfo.kelas?.nama || '-'}
              </p>
            )}
          </div>
          <button 
            onClick={fetchNilaiSaya}
            className="p-1.5 rounded-lg border border-separator hover:bg-card-subtle text-label-secondary transition-colors"
            title="Refresh Nilai"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-primary' : ''} />
          </button>
        </div>

        {groupedByMapel.length === 0 ? (
          <div className="p-10 text-center text-label-secondary flex flex-col items-center gap-2">
            <Inbox size={36} className="text-label-tertiary" />
            <p className="font-semibold text-sm text-label">Belum ada data nilai</p>
            <p className="text-xs text-label-secondary">Nilai untuk semester ini belum diinput oleh dewan guru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="text-xs font-semibold text-label-secondary uppercase tracking-wider border-b border-separator bg-card">
                  <th className="px-4 py-3">Mata Pelajaran</th>
                  <th className="px-3 py-3 text-center w-20">KKM</th>
                  <th className="px-3 py-3 text-center w-24">Tugas (40%)</th>
                  <th className="px-3 py-3 text-center w-24">UTS (30%)</th>
                  <th className="px-3 py-3 text-center w-24">UAS (30%)</th>
                  <th className="px-3 py-3 text-center w-24">Nilai Akhir</th>
                  <th className="px-3 py-3 text-center w-20">Predikat</th>
                  <th className="px-3 py-3 text-center w-28">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-separator">
                {groupedByMapel.map((item) => (
                  <tr key={item.mapel.id} className="hover:bg-bg/60 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-label">
                      {item.mapel.nama}
                      {item.mapel.guru && (
                        <span className="block text-xs font-normal text-label-secondary mt-0.5">
                          Guru: {item.mapel.guru.nama}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs text-label-secondary tabular-nums">
                      {item.mapel.kkm}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs tabular-nums">
                      {item.tugas !== null ? item.tugas : <span className="text-label-tertiary">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs tabular-nums">
                      {item.uts !== null ? item.uts : <span className="text-label-tertiary">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs tabular-nums">
                      {item.uas !== null ? item.uas : <span className="text-label-tertiary">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-sm tabular-nums">
                      {item.finalScore !== null ? item.finalScore : <span className="text-label-tertiary">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-xs">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                        item.predikat === 'A' ? 'bg-primary-subtle text-primary border border-primary-border' :
                        item.predikat === 'B' ? 'bg-accent/15 text-accent border border-accent/30' :
                        item.predikat === 'C' ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30' :
                        'bg-[var(--status-fail-bg)] text-[var(--status-fail)] border border-[var(--status-fail-border)]'
                      }`}>
                        {item.predikat}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {item.finalScore === null ? (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-fill text-label-tertiary">Belum Lengkap</span>
                      ) : item.passed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-primary-subtle text-primary border border-primary-border font-semibold">
                          <CheckCircle2 size={12} /> Tuntas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[var(--status-fail-bg)] text-[var(--status-fail)] border border-[var(--status-fail-border)] font-semibold">
                          <AlertCircle size={12} /> Remedial
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Evaluasi Sikap & Catatan Wali Kelas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Sikap */}
        <div className="bg-card rounded-xl border border-separator p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Smile className="text-primary" size={18} />
            <h2 className="text-sm font-bold text-label">Perkembangan Sikap & Karakter</h2>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="p-3 rounded-lg bg-bg border border-separator flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-label">Sikap Spiritual</span>
                <span className="px-2 py-0.5 rounded bg-primary-subtle text-primary border border-primary-border text-[11px] font-bold">
                  Predikat {catatanRapor?.sikapSpiritual || '-'}
                </span>
              </div>
              <p className="text-xs text-label-secondary mt-0.5 leading-relaxed">
                {catatanRapor?.deskripsiSpiritual || 'Belum ada catatan pembinaan.'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-bg border border-separator flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-label">Sikap Sosial</span>
                <span className="px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 text-[11px] font-bold">
                  Predikat {catatanRapor?.sikapSosial || '-'}
                </span>
              </div>
              <p className="text-xs text-label-secondary mt-0.5 leading-relaxed">
                {catatanRapor?.deskripsiSosial || 'Belum ada catatan pembinaan.'}
              </p>
            </div>
          </div>
        </div>

        {/* Ekstrakurikuler & Catatan Wali Kelas */}
        <div className="bg-card rounded-xl border border-separator p-5 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="text-accent" size={18} />
              <h2 className="text-sm font-bold text-label">Ekstrakurikuler & Catatan Bimbingan</h2>
            </div>

            <div className="mb-3">
              <span className="text-xs font-semibold text-label-secondary block mb-1.5">
                Kegiatan Ekstrakurikuler:
              </span>
              {catatanRapor?.ekskul && Array.isArray(catatanRapor.ekskul) && catatanRapor.ekskul.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {catatanRapor.ekskul.map((eks, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-bg border border-separator flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-label">{eks.nama}</span>
                        {eks.keterangan && <p className="text-[11px] text-label-secondary">{eks.keterangan}</p>}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-accent/15 text-accent font-bold font-mono">
                        {eks.predikat}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-label-tertiary italic">
                  {catatanRapor ? 'Tidak ada kegiatan ekstrakurikuler yang dicatat.' : 'Belum ada catatan ekstrakurikuler.'}
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-bg border border-separator flex flex-col gap-1">
              <span className="text-xs font-semibold text-label">Pesan Bimbingan Wali Kelas:</span>
              <p className="text-xs text-label-secondary italic leading-relaxed mt-0.5">
                {catatanRapor?.catatanWali ? `"${catatanRapor.catatanWali}"` : 'Belum ada catatan.'}
              </p>
            </div>
          </div>

          <button
            onClick={handlePrintRapor}
            disabled={isLoadingPrint || groupedByMapel.length === 0}
            className="w-full h-9 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Printer size={15} />
            <span>Cetak Pratinjau Lembar Rapor Resmi (A4)</span>
          </button>
        </div>

      </div>

      {/* Catatan & Masukan Orang Tua (Tiap Akhir Semester) */}
      <div className="bg-card rounded-xl border border-separator p-5 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-primary" size={18} />
            <h2 className="text-sm font-bold text-label">
              Catatan & Masukan Orang Tua / Wali Siswa (Akhir Semester)
            </h2>
          </div>
          {catatanRapor?.catatanOrtuAt && (
            <span className="text-[11px] text-label-tertiary">
              Tercatat pada dokumen rapor: {String(catatanRapor.catatanOrtuAt).slice(0, 10)}
            </span>
          )}
        </div>

        {saveOrtuNoteSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{saveOrtuNoteSuccess}</span>
          </div>
        )}

        {userRole === 'ORTU' ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-xs text-label-secondary leading-relaxed">
              Bapak/Ibu Orang Tua dapat memberikan catatan, tanggapan, atau pesan motivasi atas hasil belajar ananda pada semester {semester === 'GANJIL' ? 'Ganjil' : 'Genap'} T.A. {tahunAjaran}. Catatan ini akan terdokumentasi resmi pada lembar cetak rapor.
            </p>
            <textarea
              rows={3}
              placeholder="Tuliskan catatan, tanggapan, atau pesan orang tua di sini..."
              value={currentCatatanOrtu}
              onChange={(e) => setEditedNote(e.target.value)}
              className="w-full p-3 rounded-lg border border-separator bg-bg text-sm text-label placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveCatatanOrtu}
                disabled={isSavingOrtuNote}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send size={14} />
                <span>{isSavingOrtuNote ? 'Menyimpan...' : 'Simpan Catatan Orang Tua'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-lg bg-bg border border-separator text-xs">
            {catatanRapor?.catatanOrtu ? (
              <div>
                <span className="font-semibold text-label block mb-1">Catatan dari Orang Tua:</span>
                <p className="text-label-secondary italic leading-relaxed">
                  &ldquo;{catatanRapor.catatanOrtu}&rdquo;
                </p>
              </div>
            ) : (
              <p className="text-label-tertiary italic">
                Orang tua / wali murid belum mengisi catatan untuk semester ini.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal Cetak Rapor */}
      {printData && (
        <PrintableRapor
          data={printData}
          onClose={() => setPrintData(null)}
        />
      )}

    </div>
  );
}
