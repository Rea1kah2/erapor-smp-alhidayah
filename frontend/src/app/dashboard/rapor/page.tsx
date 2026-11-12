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
  RefreshCw, 
  Printer, 
  Heart, 
  Smile, 
  Activity, 
  Send 
} from 'lucide-react';
import PrintableRapor, { RaporData } from '../components/PrintableRapor';
import { useAcademicYear } from '@/lib/AcademicYearContext';

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
  const { semester, tahunAjaran, setSemester, setTahunAjaran, yearOptions } = useAcademicYear();

  const [nilaiList, setNilaiList] = useState<NilaiItem[]>([]);
  const [catatanList, setCatatanList] = useState<CatatanRaporItem[]>([]);
  const [siswaList, setSiswaList] = useState<Array<{ id: string; nama: string; nisn: string }>>([]);
  const [targetSiswaId, setTargetSiswaId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('SISWA');

  // Catatan Ortu States
  const [editedNote, setEditedNote] = useState<string | null>(null);
  const [isSavingOrtuNote, setIsSavingOrtuNote] = useState<boolean>(false);
  const [saveOrtuNoteSuccess, setSaveOrtuNoteSuccess] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Print Preview Modal
  const [printData, setPrintData] = useState<RaporData | null>(null);
  const [isLoadingPrint, setIsLoadingPrint] = useState<boolean>(false);

  // Check URL query param ?siswaId=
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sId = new URLSearchParams(window.location.search).get('siswaId');
      if (sId) {
        queueMicrotask(() => {
          setTargetSiswaId(sId);
        });
      }
    }
  }, []);

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
        if (!targetSiswaId && data[0]?.siswa?.id) setTargetSiswaId(data[0].siswa.id);
      } else {
        const loadedCatatan: CatatanRaporItem[] = data.catatanRaporList || (data.catatanRapor ? [data.catatanRapor] : []);
        setNilaiList(data.nilai || []);
        setCatatanList(loadedCatatan);
        setSiswaList(data.siswaList || []);
        
        // Tetapkan target siswa jika belum ditentukan
        if (!targetSiswaId) {
          const sId = data.siswaId || data.nilai?.[0]?.siswa?.id || data.siswaList?.[0]?.id || null;
          setTargetSiswaId(sId);
        }

        // Reset draft catatan ortu saat fetch baru
        setEditedNote(null);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(errorMessage(err, 'Gagal memuat rapor.'));
    } finally {
      setIsLoading(false);
    }
  }, [semester, tahunAjaran, targetSiswaId]);

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

  const currentSiswa = useMemo(() => {
    if (siswaList.length > 0) {
      return siswaList.find((s) => s.id === targetSiswaId) || siswaList[0];
    }
    return nilaiList[0]?.siswa || null;
  }, [siswaList, targetSiswaId, nilaiList]);

  const handlePrintRapor = async () => {
    const sId = targetSiswaId || currentSiswa?.id;
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
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
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
        <div className="p-3 rounded-lg flex items-center gap-2.5 bg-[var(--status-fail-bg)] text-[var(--status-fail)] border border-[var(--status-fail-border)] text-xs font-medium animate-in fade-in duration-150">
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
          <span className="text-[11px] text-label-secondary">Skala Nilai 0 - 100</span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Mata Pelajaran</span>
            <Award size={14} className="text-primary" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-label">
            {stats.scoredCount} <span className="text-sm font-normal text-label-secondary">/ {stats.totalMapel}</span>
          </span>
          <span className="text-[11px] text-label-secondary">Mapel yang sudah dinilai</span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Ketuntasan KKM</span>
            <CheckCircle2 size={14} className="text-primary" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-primary">{stats.tuntasCount}</span>
          <span className="text-[11px] text-label-secondary">Mapel tuntas batas KKM</span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Presensi Semester</span>
            <Activity size={14} className="text-accent" />
          </div>
          <span className="text-sm font-mono font-bold text-label mt-1">
            {catatanRapor ? `${catatanRapor.sakit} Sakit &bull; ${catatanRapor.izin} Izin &bull; ${catatanRapor.alfa} Alfa` : 'Belum Ada Data'}
          </span>
          <span className="text-[11px] text-label-secondary">Rekapitulasi Kehadiran</span>
        </div>
      </div>

      {/* Tabel Nilai Rapor */}
      <section className="bg-card rounded-xl border border-separator shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-separator flex items-center justify-between bg-bg/50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-label">
              Nilai Akademik {currentSiswa ? `(${currentSiswa.nama})` : ''}
            </span>
          </div>
          <span className="text-xs text-label-secondary">
            Semester {semester === 'GANJIL' ? 'Ganjil' : 'Genap'} &bull; T.A. {tahunAjaran}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="bg-fill/60 text-xs font-semibold text-label-secondary uppercase tracking-wider border-b border-separator">
                <th className="px-4 py-3 w-12 text-center">No</th>
                <th className="px-4 py-3">Mata Pelajaran</th>
                <th className="px-3 py-3 text-center w-20">KKM</th>
                <th className="px-3 py-3 text-center w-24">Tugas (40%)</th>
                <th className="px-3 py-3 text-center w-24">UTS (30%)</th>
                <th className="px-3 py-3 text-center w-24">UAS (30%)</th>
                <th className="px-3 py-3 text-center w-28">Nilai Akhir</th>
                <th className="px-3 py-3 text-center w-20">Predikat</th>
                <th className="px-4 py-3 text-center w-28">Keterangan</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-separator">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-label-secondary">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={20} className="animate-spin text-primary" />
                      <span className="text-xs">Memuat capaian hasil belajar...</span>
                    </div>
                  </td>
                </tr>
              ) : groupedByMapel.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-label-secondary text-xs">
                    Belum ada nilai yang diinput oleh guru untuk semester ini.
                  </td>
                </tr>
              ) : (
                groupedByMapel.map((item, idx) => (
                  <tr key={item.mapel.id} className="hover:bg-card-subtle/50 transition-colors">
                    <td className="px-4 py-3 text-center text-xs text-label-tertiary tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-label">
                      {item.mapel.nama}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-label-secondary">
                      {item.mapel.kkm}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-xs tabular-nums text-label">
                      {item.tugas !== null ? item.tugas : '-'}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-xs tabular-nums text-label">
                      {item.uts !== null ? item.uts : '-'}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-xs tabular-nums text-label">
                      {item.uas !== null ? item.uas : '-'}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-sm tabular-nums">
                      {item.finalScore !== null ? (
                        <span className={item.passed ? 'text-primary' : 'text-[var(--status-fail)]'}>
                          {item.finalScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-label-tertiary">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-xs">
                      {item.predikat !== '-' ? (
                        <span
                          className={`inline-block w-6 h-6 rounded-md text-center leading-6 text-xs font-bold ${
                            item.predikat === 'A'
                              ? 'bg-primary-subtle text-primary border border-primary-border'
                              : item.predikat === 'B'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.predikat === 'C'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-[var(--status-fail-bg)] text-[var(--status-fail)] border border-[var(--status-fail-border)]'
                          }`}
                        >
                          {item.predikat}
                        </span>
                      ) : (
                        <span className="text-label-tertiary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.finalScore !== null ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            item.passed
                              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20'
                          }`}
                        >
                          {item.passed ? 'Tuntas' : 'Remedial'}
                        </span>
                      ) : (
                        <span className="text-xs text-label-tertiary">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Catatan Tambahan (Sikap, Ekskul, Bimbingan & Catatan Ortu) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sikap & Bimbingan Wali */}
        <section className="bg-card rounded-xl border border-separator p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-separator pb-2.5">
            <Smile size={18} className="text-primary" />
            <h2 className="font-semibold text-sm text-label">Catatan Perkembangan & Sikap</h2>
          </div>

          <div className="flex flex-col gap-2.5 text-xs">
            <div>
              <span className="font-semibold text-label-secondary block mb-0.5">Sikap Spiritual:</span>
              <p className="text-label bg-fill/60 p-2.5 rounded-lg border border-separator/40 leading-relaxed">
                {catatanRapor?.deskripsiSpiritual || 'Belum ada catatan sikap spiritual dari wali kelas.'}
              </p>
            </div>

            <div>
              <span className="font-semibold text-label-secondary block mb-0.5">Sikap Sosial:</span>
              <p className="text-label bg-fill/60 p-2.5 rounded-lg border border-separator/40 leading-relaxed">
                {catatanRapor?.deskripsiSosial || 'Belum ada catatan sikap sosial dari wali kelas.'}
              </p>
            </div>

            <div>
              <span className="font-semibold text-label-secondary block mb-0.5">Catatan Bimbingan Wali Kelas:</span>
              <p className="text-label bg-primary-subtle/50 p-2.5 rounded-lg border border-primary-border/40 leading-relaxed font-medium">
                {catatanRapor?.catatanWali || 'Belum ada catatan motivasi dari wali kelas.'}
              </p>
            </div>
          </div>
        </section>

        {/* Form Respon & Catatan Orang Tua */}
        <section className="bg-card rounded-xl border border-separator p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-separator pb-2.5">
            <Heart size={18} className="text-accent" />
            <h2 className="font-semibold text-sm text-label">Respon & Catatan Orang Tua</h2>
          </div>

          {saveOrtuNoteSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <span>{saveOrtuNoteSuccess}</span>
            </div>
          )}

          <p className="text-xs text-label-secondary leading-relaxed">
            Orang tua atau wali murid dapat memberikan tanggapan, konfirmasi pengawasan, atau pesan bimbingan untuk guru dan anak:
          </p>

          <textarea
            rows={4}
            value={currentCatatanOrtu}
            onChange={(e) => setEditedNote(e.target.value)}
            disabled={userRole !== 'ORTU' && userRole !== 'ADMIN'}
            placeholder={
              userRole === 'ORTU' || userRole === 'ADMIN'
                ? "Tuliskan catatan orang tua di sini (misal: 'Terima kasih atas bimbingan Bapak/Ibu guru...')"
                : "Hanya akun Orang Tua yang dapat menginput catatan ini."
            }
            className="w-full p-3 rounded-lg bg-bg border border-separator text-xs text-label focus:outline-none focus:border-primary disabled:opacity-75 resize-none leading-relaxed"
          />

          {(userRole === 'ORTU' || userRole === 'ADMIN') && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveCatatanOrtu}
                disabled={isSavingOrtuNote || currentCatatanOrtu === (catatanRapor?.catatanOrtu || '')}
                className="h-8.5 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSavingOrtuNote ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Simpan Catatan Ortu</span>
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Modal Print Preview Rapor */}
      {printData && (
        <PrintableRapor 
          data={printData} 
          onClose={() => setPrintData(null)} 
        />
      )}

    </div>
  );
}
