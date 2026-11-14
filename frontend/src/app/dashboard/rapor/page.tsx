// frontend/src/app/dashboard/rapor/page.tsx
'use client';
import { apiFetch } from "@/lib/api";
import { errorMessage } from '@/lib/errors';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Printer,
  Heart,
  Smile,
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-separator">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-label">
            Transparansi Hasil Belajar & Rapor
          </h1>
          <p className="text-xs sm:text-sm text-label-secondary mt-1">
            Laporan evaluasi capaian kompetensi nilai akademik dan presensi peserta didik
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {siswaList.length > 1 && (
            <select
              value={targetSiswaId || ''}
              onChange={(e) => setTargetSiswaId(e.target.value)}
              className="h-9 px-3 rounded-lg bg-card border border-separator text-label text-xs font-medium focus:border-primary outline-none cursor-pointer"
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
            className="h-9 px-3 rounded-lg bg-card border border-separator text-label text-xs font-medium focus:border-primary outline-none cursor-pointer"
          >
            <option value="GANJIL">Semester Ganjil</option>
            <option value="GENAP">Semester Genap</option>
          </select>

          <select
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            className="h-9 px-3 rounded-lg bg-card border border-separator text-label text-xs font-medium focus:border-primary outline-none cursor-pointer"
          >
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>

          <button
            onClick={handlePrintRapor}
            disabled={isLoadingPrint || groupedByMapel.length === 0}
            className="h-9 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
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

      {/* KPI Typographic Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-separator border border-separator rounded-xl overflow-hidden">
        <div className="bg-card p-4 flex flex-col gap-1">
          <span className="text-[13px] font-medium text-label-secondary">Rata-rata nilai</span>
          <span className="text-2xl font-semibold num-tabular text-label">{stats.rataRata}</span>
          <span className="text-xs text-label-secondary">Skala nilai 0 - 100</span>
        </div>

        <div className="bg-card p-4 flex flex-col gap-1">
          <span className="text-[13px] font-medium text-label-secondary">Mata pelajaran</span>
          <span className="text-2xl font-semibold num-tabular text-label">
            {stats.scoredCount} <span className="text-sm font-normal text-label-secondary">/ {stats.totalMapel}</span>
          </span>
          <span className="text-xs text-label-secondary">Mapel sudah dinilai</span>
        </div>

        <div className="bg-card p-4 flex flex-col gap-1">
          <span className="text-[13px] font-medium text-label-secondary">Ketuntasan KKM</span>
          <span className="text-2xl font-semibold num-tabular text-primary">{stats.tuntasCount}</span>
          <span className="text-xs text-label-secondary">Mapel tuntas KKM</span>
        </div>

        <div className="bg-card p-4 flex flex-col gap-1">
          <span className="text-[13px] font-medium text-label-secondary">Presensi semester</span>
          <span className="text-sm font-semibold num-tabular text-label mt-1">
            {catatanRapor ? `${catatanRapor.sakit} Sakit \u2022 ${catatanRapor.izin} Izin \u2022 ${catatanRapor.alfa} Alfa` : 'Belum ada data'}
          </span>
          <span className="text-xs text-label-secondary">Rekapitulasi kehadiran</span>
        </div>
      </div>

      {/* Tabel Nilai Rapor */}
      <section className="bg-card rounded-xl border border-separator overflow-hidden flex flex-col">
        <div className="p-4 border-b border-separator flex items-center justify-between bg-fill/30">
          <span className="font-semibold text-sm text-label">
            Nilai Akademik {currentSiswa ? `(${currentSiswa.nama})` : ''}
          </span>
          <span className="text-xs text-label-secondary font-id">
            Semester {semester === 'GANJIL' ? 'Ganjil' : 'Genap'} &middot; {tahunAjaran}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="bg-fill/50 text-xs font-medium text-label-secondary border-b border-separator">
                <th className="px-4 py-3 w-12 text-center">No</th>
                <th className="px-4 py-3">Mata Pelajaran</th>
                <th className="px-3 py-3 text-right w-20">KKM</th>
                <th className="px-3 py-3 text-right w-24">Tugas (40%)</th>
                <th className="px-3 py-3 text-right w-24">UTS (30%)</th>
                <th className="px-3 py-3 text-right w-24">UAS (30%)</th>
                <th className="px-3 py-3 text-right w-28">Nilai Akhir</th>
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
                  <tr key={item.mapel.id} className="hover:bg-card-subtle transition-colors">
                    <td className="px-4 py-3 text-center text-xs text-label-tertiary num-tabular">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-label">
                      {item.mapel.nama}
                    </td>
                    <td className="px-3 py-3 text-right num-tabular text-xs text-label-secondary">
                      {item.mapel.kkm}
                    </td>
                    <td className="px-3 py-3 text-right num-tabular text-xs text-label">
                      {item.tugas !== null ? item.tugas : '-'}
                    </td>
                    <td className="px-3 py-3 text-right num-tabular text-xs text-label">
                      {item.uts !== null ? item.uts : '-'}
                    </td>
                    <td className="px-3 py-3 text-right num-tabular text-xs text-label">
                      {item.uas !== null ? item.uas : '-'}
                    </td>
                    <td className="px-3 py-3 text-right num-tabular font-semibold text-sm">
                      {item.finalScore !== null ? (
                        <span className={item.passed ? 'text-primary' : 'text-[var(--status-fail)]'}>
                          {item.finalScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-label-tertiary">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-xs">
                      {item.predikat !== '-' ? (
                        <span
                          className={`inline-block w-6 h-6 rounded-md text-center leading-6 text-xs font-semibold ${
                            item.predikat === 'A'
                              ? 'bg-primary-subtle text-primary border border-primary-border'
                              : item.predikat === 'B'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50'
                              : item.predikat === 'C'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50'
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
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            item.passed
                              ? 'bg-primary-subtle text-primary border border-primary-border'
                              : 'bg-[var(--status-fail-bg)] text-[var(--status-fail)] border border-[var(--status-fail-border)]'
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

      {/* Catatan Tambahan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-card rounded-xl border border-separator p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-separator pb-2.5">
            <Smile size={17} className="text-primary" />
            <h2 className="font-semibold text-sm text-label">Catatan Perkembangan & Sikap</h2>
          </div>

          <div className="flex flex-col gap-2.5 text-xs">
            <div>
              <span className="font-semibold text-label-secondary block mb-0.5">Sikap Spiritual:</span>
              <p className="text-label bg-fill/50 p-2.5 rounded-lg border border-separator leading-relaxed">
                {catatanRapor?.deskripsiSpiritual || 'Belum ada catatan sikap spiritual dari wali kelas.'}
              </p>
            </div>

            <div>
              <span className="font-semibold text-label-secondary block mb-0.5">Sikap Sosial:</span>
              <p className="text-label bg-fill/50 p-2.5 rounded-lg border border-separator leading-relaxed">
                {catatanRapor?.deskripsiSosial || 'Belum ada catatan sikap sosial dari wali kelas.'}
              </p>
            </div>

            <div>
              <span className="font-semibold text-label-secondary block mb-0.5">Catatan Bimbingan Wali Kelas:</span>
              <p className="text-label bg-primary-subtle p-2.5 rounded-lg border border-primary-border leading-relaxed font-medium">
                {catatanRapor?.catatanWali || 'Belum ada catatan motivasi dari wali kelas.'}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-card rounded-xl border border-separator p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-separator pb-2.5">
            <Heart size={17} className="text-accent" />
            <h2 className="font-semibold text-sm text-label">Respon & Catatan Orang Tua</h2>
          </div>

          {saveOrtuNoteSuccess && (
            <div className="p-2.5 rounded-lg bg-primary-subtle border border-primary-border text-primary text-xs font-medium flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0" />
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
                className="h-8.5 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
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
