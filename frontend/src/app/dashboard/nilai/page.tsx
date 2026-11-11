// frontend/src/app/dashboard/nilai/page.tsx
'use client';
import { apiFetch } from "@/lib/api";
import { errorMessage } from '@/lib/errors';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet,
  Search,
  Save,
  Filter,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Layers,
  Award,
  BookOpen,
  TrendingUp,
  RefreshCw,
  Plus,
  X,
  Keyboard
} from 'lucide-react';

interface Kelas {
  id: string;
  nama: string;
  tingkat: number;
}

interface Mapel {
  id: string;
  nama: string;
  kkm: number;
  guru?: { nama: string } | null;
}

interface Siswa {
  id: string;
  nama: string;
  nisn: string;
  kelasId: string | null;
  kelas?: { nama: string } | null;
}

interface NilaiRecord {
  id: string;
  skor: number;
  jenis: string; // "TUGAS", "UTS", "UAS"
  semester: string;
  tahunAjaran: string;
  siswaId: string;
  mapelId: string;
}

const JENIS_NILAI = ['TUGAS', 'UTS', 'UAS'] as const;
type JenisNilaiType = (typeof JENIS_NILAI)[number];

export default function NilaiPage() {
  // Master options
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [manualMapelList, setManualMapelList] = useState<Mapel[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [allSiswaList, setAllSiswaList] = useState<Siswa[]>([]);

  // Filter selections
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedMapelId, setSelectedMapelId] = useState<string>('');
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [semester, setSemester] = useState<string>('GANJIL');
  const [tahunAjaran, setTahunAjaran] = useState<string>('');

  // Nilai data states
  const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
  const [initialScores, setInitialScores] = useState<Record<string, Record<string, string>>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Status states
  const [isLoadingMaster, setIsLoadingMaster] = useState<boolean>(true);
  const [isLoadingNilai, setIsLoadingNilai] = useState<boolean>(false);
  const [savingSiswaId, setSavingSiswaId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Modal Input Nilai Manual Single Siswa
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    siswaId: '',
    mapelId: '',
    semester: 'GANJIL',
    tahunAjaran: '',
    tugas: '',
    uts: '',
    uas: ''
  });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Fetch classes, subjects, and all students on mount
  useEffect(() => {
    const fetchMaster = async () => {
      setIsLoadingMaster(true);
      try {
        const headers = {};

        const [resKelas, resMapel, resAllSiswa, resYears] = await Promise.all([
          apiFetch('/api/master/kelas', { headers }),
          apiFetch('/api/master/mapel', { headers }),
          apiFetch('/api/master/siswa', { headers }),
          apiFetch('/api/master/tahun-ajaran', { headers })
        ]);

        if (resKelas.ok) {
          const kData: Kelas[] = await resKelas.json();
          setKelasList(kData);
          if (kData.length > 0) setSelectedKelasId(kData[0].id);
        }

        if (resMapel.ok) {
          const mData: Mapel[] = await resMapel.json();
          setMapelList(mData);
          if (mData.length > 0) setSelectedMapelId(mData[0].id);
        }

        if (resAllSiswa.ok) {
          const sData: Siswa[] = await resAllSiswa.json();
          setAllSiswaList(sData);
        }
        if (resYears.ok) {
          const years: Array<{ nama: string; aktif: boolean }> = await resYears.json();
          setYearOptions(years.map((year) => year.nama));
          const activeYear = years.find((year) => year.aktif)?.nama;
          if (activeYear) {
            setTahunAjaran(activeYear);
            setManualForm((previous) => ({ ...previous, tahunAjaran: activeYear }));
          }
        }
      } catch (err) {
        console.error('Gagal memuat master kelas & mapel', err);
        setErrorMsg('Gagal memuat daftar kelas atau mata pelajaran.');
      } finally {
        setIsLoadingMaster(false);
      }
    };

    fetchMaster();
  }, []);

  useEffect(() => {
    if (!tahunAjaran) return;
    const loadAcademicYear = async () => {
      const [classResponse, subjectResponse, studentResponse] = await Promise.all([
        apiFetch(`/api/master/kelas?tahunAjaran=${encodeURIComponent(tahunAjaran)}`),
        apiFetch(`/api/master/mapel?tahunAjaran=${encodeURIComponent(tahunAjaran)}`),
        apiFetch(`/api/master/siswa?tahunAjaran=${encodeURIComponent(tahunAjaran)}`)
      ]);
      if (classResponse.ok) {
        const classes: Kelas[] = await classResponse.json();
        setKelasList(classes);
        setSelectedKelasId((current) => classes.some((kelas) => kelas.id === current) ? current : classes[0]?.id || '');
      }
      if (subjectResponse.ok) {
        const subjects: Mapel[] = await subjectResponse.json();
        setMapelList(subjects);
        setSelectedMapelId((current) => subjects.some((mapel) => mapel.id === current) ? current : subjects[0]?.id || '');
      }
      if (studentResponse.ok) setAllSiswaList(await studentResponse.json());
    };
    loadAcademicYear().catch(() => setErrorMsg('Gagal memuat data akademik untuk tahun ajaran tersebut.'));
  }, [tahunAjaran]);

  useEffect(() => {
    if (!tahunAjaran || !selectedKelasId) return;
    let cancelled = false;
    apiFetch(`/api/master/mapel?tahunAjaran=${encodeURIComponent(tahunAjaran)}&kelasId=${encodeURIComponent(selectedKelasId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Gagal memuat mata pelajaran kelas.');
        const subjects: Mapel[] = await response.json();
        if (cancelled) return;
        setMapelList(subjects);
        setSelectedMapelId((current) => subjects.some((subject) => subject.id === current) ? current : subjects[0]?.id || '');
      })
      .catch(() => {
        if (!cancelled) setErrorMsg('Gagal memuat mata pelajaran untuk kelas yang dipilih.');
      });
    return () => { cancelled = true; };
  }, [tahunAjaran, selectedKelasId]);

  useEffect(() => {
    if (!isManualModalOpen || !manualForm.tahunAjaran || !manualForm.siswaId) return;
    const selectedStudent = allSiswaList.find((student) => student.id === manualForm.siswaId);
    if (!selectedStudent?.kelasId) {
      let cancelled = false;
      queueMicrotask(() => {
        if (cancelled) return;
        setManualMapelList([]);
        setManualForm((current) => ({ ...current, mapelId: '' }));
      });
      return () => { cancelled = true; };
    }
    let cancelled = false;
    apiFetch(`/api/master/mapel?tahunAjaran=${encodeURIComponent(manualForm.tahunAjaran)}&kelasId=${encodeURIComponent(selectedStudent.kelasId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Gagal memuat mata pelajaran siswa.');
        const subjects: Mapel[] = await response.json();
        if (cancelled) return;
        setManualMapelList(subjects);
        setManualForm((current) => ({
          ...current,
          mapelId: subjects.some((subject) => subject.id === current.mapelId) ? current.mapelId : subjects[0]?.id || ''
        }));
      })
      .catch(() => {
        if (!cancelled) setErrorMsg('Gagal memuat mata pelajaran untuk siswa yang dipilih.');
      });
    return () => { cancelled = true; };
  }, [isManualModalOpen, manualForm.siswaId, manualForm.tahunAjaran, allSiswaList]);

  // Fetch students & scores when filter changes
  const fetchFilterData = useCallback(async () => {
    if (!selectedKelasId || !selectedMapelId) return;

    setIsLoadingNilai(true);
    setErrorMsg('');

    try {
      const headers = {};

      const [resSiswa, resNilai] = await Promise.all([
        apiFetch(`/api/master/siswa?kelasId=${selectedKelasId}&tahunAjaran=${encodeURIComponent(tahunAjaran)}`, { headers }),
        apiFetch(
          `/api/nilai/mapel?mapelId=${selectedMapelId}&semester=${semester}&tahunAjaran=${encodeURIComponent(tahunAjaran)}&kelasId=${selectedKelasId}`,
          { headers }
        ),
      ]);

      let currentSiswa: Siswa[] = [];
      if (resSiswa.ok) {
        currentSiswa = await resSiswa.json();
        setSiswaList(currentSiswa);
      }

      if (resNilai.ok) {
        const nilaiData: NilaiRecord[] = await resNilai.json();
        const mappedScores: Record<string, Record<string, string>> = {};

        currentSiswa.forEach((s) => {
          mappedScores[s.id] = { TUGAS: '', UTS: '', UAS: '' };
        });

        nilaiData.forEach((item) => {
          if (!mappedScores[item.siswaId]) {
            mappedScores[item.siswaId] = { TUGAS: '', UTS: '', UAS: '' };
          }
          mappedScores[item.siswaId][item.jenis] = item.skor !== null ? String(item.skor) : '';
        });

        setScores(mappedScores);
        // Salin untuk deteksi perubahan (dirty tracking)
        setInitialScores(JSON.parse(JSON.stringify(mappedScores)));
      }
    } catch (err) {
      console.error('Gagal mengambil data siswa & nilai', err);
      setErrorMsg('Gagal memuat data siswa & nilai untuk filter yang dipilih.');
    } finally {
      setIsLoadingNilai(false);
    }
  }, [selectedKelasId, selectedMapelId, semester, tahunAjaran]);

  useEffect(() => {
    queueMicrotask(() => { void fetchFilterData(); });
  }, [fetchFilterData]);

  const selectedMapel = useMemo(() => {
    return mapelList.find((m) => m.id === selectedMapelId);
  }, [mapelList, selectedMapelId]);

  const selectedKelas = useMemo(() => {
    return kelasList.find((k) => k.id === selectedKelasId);
  }, [kelasList, selectedKelasId]);

  // Handle score change
  const handleScoreChange = (siswaId: string, jenis: JenisNilaiType, value: string) => {
    if (value !== '' && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 100)) {
      return;
    }

    setScores((prev) => ({
      ...prev,
      [siswaId]: {
        ...(prev[siswaId] || {}),
        [jenis]: value,
      },
    }));
  };

  // Check if a row has unsaved modifications
  const isRowDirty = useCallback((siswaId: string) => {
    const current = scores[siswaId];
    const initial = initialScores[siswaId];
    if (!current || !initial) return false;
    return (
      (current.TUGAS || '') !== (initial.TUGAS || '') ||
      (current.UTS || '') !== (initial.UTS || '') ||
      (current.UAS || '') !== (initial.UAS || '')
    );
  }, [scores, initialScores]);

  // Filtered student list by search input
  const filteredSiswa = useMemo(() => {
    if (!searchQuery.trim()) return siswaList;
    const query = searchQuery.toLowerCase();
    return siswaList.filter((student) => 
      student.nama.toLowerCase().includes(query) || student.nisn.toLowerCase().includes(query)
    );
  }, [searchQuery, siswaList]);

  // Hitung berapa siswa yang nilainya diubah tapi belum disimpan
  const dirtyCount = useMemo(() => {
    return filteredSiswa.filter((s) => isRowDirty(s.id)).length;
  }, [filteredSiswa, isRowDirty]);

  // Save single student's scores
  const saveStudentScores = useCallback(async (siswaId: string) => {
    const studentScores = scores[siswaId];
    if (!studentScores) return;

    setSavingSiswaId(siswaId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const headers = { 'Content-Type': 'application/json' };

      const promises = JENIS_NILAI.map(async (jenis) => {
        const val = studentScores[jenis];
        if (val !== undefined && val !== '') {
          const res = await apiFetch('/api/nilai', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              siswaId,
              mapelId: selectedMapelId,
              jenis,
              skor: Number(val),
              semester,
              tahunAjaran,
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || `Gagal menyimpan nilai ${jenis}`);
          }
        }
      });

      await Promise.all(promises);
      
      // Update snapshot initial
      setInitialScores((prev) => ({
        ...prev,
        [siswaId]: { ...studentScores }
      }));

      setSuccessMsg('Nilai siswa berhasil disimpan!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal menyimpan nilai.'));
    } finally {
      setSavingSiswaId(null);
    }
  }, [scores, selectedMapelId, semester, tahunAjaran]);

  // Save all students' scores
  const saveAllScores = useCallback(async () => {
    setSavingAll(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const headers = { 'Content-Type': 'application/json' };
      const promises: Promise<void>[] = [];

      filteredSiswa.forEach((siswa) => {
        const studentScores = scores[siswa.id];
        if (!studentScores) return;

        JENIS_NILAI.forEach((jenis) => {
          const val = studentScores[jenis];
          if (val !== undefined && val !== '') {
            promises.push(
              apiFetch('/api/nilai', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  siswaId: siswa.id,
                  mapelId: selectedMapelId,
                  jenis,
                  skor: Number(val),
                  semester,
                  tahunAjaran,
                }),
              }).then(async (res) => {
                if (!res.ok) {
                  const err = await res.json();
                  throw new Error(err.error || `Gagal menyimpan nilai ${jenis} siswa ${siswa.nama}`);
                }
              })
            );
          }
        });
      });

      if (promises.length === 0) {
        setErrorMsg('Tidak ada nilai untuk disimpan.');
        setSavingAll(false);
        return;
      }

      await Promise.all(promises);

      // Sinkronkan seluruh snapshot awal
      setInitialScores(JSON.parse(JSON.stringify(scores)));

      setSuccessMsg(`Semua nilai untuk kelas ${selectedKelas?.nama || ''} berhasil disimpan!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal menyimpan semua nilai.'));
    } finally {
      setSavingAll(false);
    }
  }, [filteredSiswa, scores, selectedKelas, selectedMapelId, semester, tahunAjaran]);

  // Keyboard Navigation: Enter or ArrowDown jumps to next student in same column, ArrowUp jumps to previous
  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    jenis: JenisNilaiType
  ) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveAllScores();
      return;
    }

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector<HTMLInputElement>(
        `input[data-row-idx="${rowIndex + 1}"][data-col-type="${jenis}"]`
      );
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector<HTMLInputElement>(
        `input[data-row-idx="${rowIndex - 1}"][data-col-type="${jenis}"]`
      );
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  };

  // Global Ctrl+S / Cmd+S Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveAllScores();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [saveAllScores]);

  // Handle Submit Modal Tambah Nilai Manual
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.siswaId || !manualForm.mapelId) {
      setErrorMsg('Pilih siswa dan mata pelajaran terlebih dahulu.');
      return;
    }

    setIsSubmittingManual(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const headers = { 'Content-Type': 'application/json' };
      const entries = [
        { jenis: 'TUGAS', skor: manualForm.tugas },
        { jenis: 'UTS', skor: manualForm.uts },
        { jenis: 'UAS', skor: manualForm.uas },
      ];

      for (const entry of entries) {
        if (entry.skor !== '') {
          const res = await apiFetch('/api/nilai', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              siswaId: manualForm.siswaId,
              mapelId: manualForm.mapelId,
              jenis: entry.jenis,
              skor: Number(entry.skor),
              semester: manualForm.semester,
              tahunAjaran: manualForm.tahunAjaran,
            })
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || `Gagal menyimpan nilai ${entry.jenis}`);
          }
        }
      }

      setIsManualModalOpen(false);
      setSuccessMsg('Data nilai manual berhasil disimpan!');
      setTimeout(() => setSuccessMsg(''), 3000);

      if (manualForm.mapelId === selectedMapelId && manualForm.semester === semester && manualForm.tahunAjaran === tahunAjaran) {
        fetchFilterData();
      }
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal menyimpan nilai manual.'));
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const openManualModal = () => {
    setManualForm({
      siswaId: allSiswaList[0]?.id || '',
      mapelId: selectedMapelId || mapelList[0]?.id || '',
      semester: semester || 'GANJIL',
      tahunAjaran: tahunAjaran || yearOptions[0] || '',
      tugas: '',
      uts: '',
      uas: ''
    });
    setErrorMsg('');
    setIsManualModalOpen(true);
  };

  // Perhitungan Nilai Akhir sesuai formula: Tugas 40%, UTS 30%, UAS 30%
  const calculateFinal = useCallback((studentScores?: Record<string, string>) => {
    if (!studentScores) return { avg: null, passed: false, predikat: '-' };
    const components = [
      { value: studentScores.TUGAS, weight: 0.4 },
      { value: studentScores.UTS, weight: 0.3 },
      { value: studentScores.UAS, weight: 0.3 }
    ].filter((component) => component.value !== undefined && component.value !== '');
    if (components.length === 0) return { avg: null, passed: false, predikat: '-' };
    
    const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
    const weightedScore = components.reduce((sum, component) => sum + Number(component.value) * component.weight, 0);
    const finalScore = Math.round((weightedScore / totalWeight) * 10) / 10;
    const kkm = selectedMapel?.kkm ?? 75;

    let predikat = 'D';
    if (finalScore >= 90) predikat = 'A';
    else if (finalScore >= 80) predikat = 'B';
    else if (finalScore >= kkm) predikat = 'C';
    else predikat = 'D';

    return {
      avg: finalScore,
      passed: finalScore >= kkm,
      predikat
    };
  }, [selectedMapel?.kkm]);

  // Overall class statistics
  const statsSummary = useMemo(() => {
    let completedCount = 0;
    let tuntasCount = 0;
    let totalScoreSum = 0;
    const kkm = selectedMapel?.kkm ?? 75;

    filteredSiswa.forEach((s) => {
      const { avg, passed } = calculateFinal(scores[s.id]);
      if (avg !== null) {
        completedCount++;
        totalScoreSum += avg;
        if (passed) tuntasCount++;
      }
    });

    const avgKelas = completedCount > 0 ? (totalScoreSum / completedCount).toFixed(1) : '0';
    const percentTuntas = completedCount > 0 ? Math.round((tuntasCount / completedCount) * 100) : 0;

    return {
      totalSiswa: filteredSiswa.length,
      dinilai: completedCount,
      avgKelas,
      percentTuntas,
      kkm,
    };
  }, [filteredSiswa, scores, selectedMapel, calculateFinal]);

  return (
    <div className="flex flex-col gap-5">
      
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label flex items-center gap-2">
            <FileSpreadsheet className="text-primary" size={24} />
            <span>Matriks Penilaian Mata Pelajaran</span>
          </h1>
          <p className="text-xs sm:text-sm text-label-secondary mt-0.5">
            Formula Resmi: Tugas/Harian (40%) &bull; UTS (30%) &bull; UAS (30%) &bull; KKM {selectedMapel?.kkm || 75}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={openManualModal}
            className="h-9 px-3.5 rounded-lg border border-separator hover:bg-card-subtle text-xs font-semibold text-label flex items-center gap-1.5 transition-colors"
          >
            <Plus size={16} />
            <span>Input Tunggal</span>
          </button>

          {filteredSiswa.length > 0 && (
            <button
              onClick={saveAllScores}
              disabled={savingAll || isLoadingNilai}
              className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {savingAll ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Simpan Semua</span>
                  {dirtyCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[var(--status-dirty)] text-white text-[10px] font-bold font-mono">
                      {dirtyCount}
                    </span>
                  )}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded-lg flex items-center gap-2.5 bg-primary-subtle border border-primary-border text-primary text-xs font-medium">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !isManualModalOpen && (
        <div className="p-3 rounded-lg flex items-center gap-2.5 bg-[var(--status-fail-bg)] border border-[var(--status-fail-border)] text-[var(--status-fail)] text-xs font-medium">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Section (Solid Crisp Card) */}
      <section className="bg-card rounded-xl border border-separator p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-label-secondary uppercase tracking-wider">
            <Filter size={14} className="text-primary" />
            <span>Filter Kelas & Mata Pelajaran</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-label-tertiary">
            <Keyboard size={13} />
            <span>Navigasi: Enter / Panah Bawah untuk turun baris &bull; Simpan: Ctrl+S</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Kelas */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-label">Kelas</label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              disabled={isLoadingMaster || kelasList.length === 0}
              className="h-9 px-3 rounded-lg bg-bg border border-separator text-label text-xs font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
            >
              {kelasList.length === 0 ? (
                <option value="">Belum ada kelas</option>
              ) : (
                kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} (Tingkat {k.tingkat})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Mapel */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-label">Mata Pelajaran</label>
            <select
              value={selectedMapelId}
              onChange={(e) => setSelectedMapelId(e.target.value)}
              disabled={isLoadingMaster || mapelList.length === 0}
              className="h-9 px-3 rounded-lg bg-bg border border-separator text-label text-xs font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
            >
              {mapelList.length === 0 ? (
                <option value="">Belum ada mata pelajaran</option>
              ) : (
                mapelList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nama} (KKM: {m.kkm})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Semester */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-label">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="h-9 px-3 rounded-lg bg-bg border border-separator text-label text-xs font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
            >
              <option value="GANJIL">Semester Ganjil</option>
              <option value="GENAP">Semester Genap</option>
            </select>
          </div>

          {/* Tahun Ajaran */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-label">Tahun Ajaran</label>
            <select
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              className="h-9 px-3 rounded-lg bg-bg border border-separator text-label text-xs font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
            >
              {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Standar KKM</span>
            <Award size={14} className="text-accent" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-label">
            {selectedMapel ? selectedMapel.kkm : '-'}
          </span>
          <span className="text-[11px] text-label-secondary truncate">
            {selectedMapel?.nama || '-'}
          </span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Kelengkapan Nilai</span>
            <Layers size={14} className="text-primary" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-label">
            {statsSummary.dinilai} <span className="text-sm font-normal text-label-secondary">/ {statsSummary.totalSiswa}</span>
          </span>
          <span className="text-[11px] text-label-secondary">
            {statsSummary.totalSiswa > 0
              ? `${Math.round((statsSummary.dinilai / statsSummary.totalSiswa) * 100)}% siswa ternilai`
              : 'Belum ada siswa'}
          </span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Rata-Rata Kelas</span>
            <TrendingUp size={14} className="text-accent" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-label">
            {statsSummary.avgKelas}
          </span>
          <span className="text-[11px] text-label-secondary">Skala 0 - 100</span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tuntas KKM</span>
            <BookOpen size={14} className="text-primary" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-primary">
            {statsSummary.percentTuntas}%
          </span>
          <span className="text-[11px] text-label-secondary">&ge; {statsSummary.kkm} poin KKM</span>
        </div>
      </div>

      {/* Spreadsheet-Grade Matrix Table */}
      <section className="bg-card rounded-xl border border-separator shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Controls Header */}
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-separator bg-bg/50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-label">
              Daftar Peserta Didik {selectedKelas ? `Kelas ${selectedKelas.nama}` : ''}
            </span>
            {dirtyCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--status-dirty-bg)] border border-[var(--status-dirty-border)] text-[var(--status-dirty)] text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-dirty)] animate-pulse"></span>
                {dirtyCount} siswa belum disimpan
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary" />
            <input
              type="text"
              placeholder="Cari nama atau NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-bg border border-separator text-label text-xs placeholder:text-label-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Scrollable Table Area with Sticky Headers */}
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead className="sticky top-0 z-20 bg-card border-b border-separator shadow-xs">
              <tr className="text-xs font-semibold text-label-secondary uppercase tracking-wider">
                <th className="px-4 py-3 w-12 text-center">No</th>
                <th className="px-4 py-3 min-w-[200px]">Nama Peserta Didik / NISN</th>
                <th className="px-3 py-3 w-28 text-center bg-bg/30">Tugas (40%)</th>
                <th className="px-3 py-3 w-28 text-center bg-bg/30">UTS (30%)</th>
                <th className="px-3 py-3 w-28 text-center bg-bg/30">UAS (30%)</th>
                <th className="px-3 py-3 w-24 text-center">Nilai Akhir</th>
                <th className="px-3 py-3 w-20 text-center">Predikat</th>
                <th className="px-3 py-3 w-28 text-center">Status</th>
                <th className="px-4 py-3 w-16 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-separator">
              {isLoadingNilai || isLoadingMaster ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-label-secondary">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={20} className="animate-spin text-primary" />
                      <span className="text-xs">Memuat data nilai siswa...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox size={36} className="text-label-tertiary" />
                      <p className="font-semibold text-sm text-label">Tidak ada data siswa ditemukan</p>
                      <p className="text-xs text-label-secondary max-w-sm">
                        Belum ada siswa di kelas ini atau tidak cocok dengan kata kunci pencarian.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSiswa.map((siswa, idx) => {
                  const studentScores = scores[siswa.id] || { TUGAS: '', UTS: '', UAS: '' };
                  const { avg, passed, predikat } = calculateFinal(studentScores);
                  const isSavingThis = savingSiswaId === siswa.id;
                  const rowDirty = isRowDirty(siswa.id);

                  return (
                    <tr
                      key={siswa.id}
                      className={`transition-colors ${
                        rowDirty 
                          ? 'bg-[var(--status-dirty-bg)]/40 hover:bg-[var(--status-dirty-bg)]/60' 
                          : 'hover:bg-bg/60'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-center text-xs font-mono text-label-tertiary tabular-nums">
                        {idx + 1}
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="font-medium text-label text-sm flex items-center gap-1.5">
                          <span>{siswa.nama}</span>
                          {rowDirty && (
                            <span className="w-2 h-2 rounded-full bg-[var(--status-dirty)] shrink-0" title="Ada perubahan belum disimpan" />
                          )}
                        </div>
                        <div className="text-xs font-mono text-label-secondary tabular-nums">
                          {siswa.nisn}
                        </div>
                      </td>

                      {/* Tugas Input */}
                      <td className="px-3 py-2 text-center bg-bg/20">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          data-row-idx={idx}
                          data-col-type="TUGAS"
                          placeholder="-"
                          value={studentScores.TUGAS ?? ''}
                          onChange={(e) => handleScoreChange(siswa.id, 'TUGAS', e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, idx, 'TUGAS')}
                          className="w-20 h-8 text-center rounded-md border border-separator bg-card font-mono text-xs font-semibold text-label tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-label-tertiary"
                        />
                      </td>

                      {/* UTS Input */}
                      <td className="px-3 py-2 text-center bg-bg/20">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          data-row-idx={idx}
                          data-col-type="UTS"
                          placeholder="-"
                          value={studentScores.UTS ?? ''}
                          onChange={(e) => handleScoreChange(siswa.id, 'UTS', e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, idx, 'UTS')}
                          className="w-20 h-8 text-center rounded-md border border-separator bg-card font-mono text-xs font-semibold text-label tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-label-tertiary"
                        />
                      </td>

                      {/* UAS Input */}
                      <td className="px-3 py-2 text-center bg-bg/20">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          data-row-idx={idx}
                          data-col-type="UAS"
                          placeholder="-"
                          value={studentScores.UAS ?? ''}
                          onChange={(e) => handleScoreChange(siswa.id, 'UAS', e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, idx, 'UAS')}
                          className="w-20 h-8 text-center rounded-md border border-separator bg-card font-mono text-xs font-semibold text-label tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-label-tertiary"
                        />
                      </td>

                      {/* Nilai Akhir Auto-Calculated */}
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`font-mono font-bold tabular-nums text-sm ${
                            avg === null
                              ? 'text-label-tertiary'
                              : passed
                              ? 'text-primary'
                              : 'text-[var(--status-fail)]'
                          }`}
                        >
                          {avg !== null ? avg : '-'}
                        </span>
                      </td>

                      {/* Predikat */}
                      <td className="px-3 py-2 text-center font-bold text-xs">
                        <span className={passed ? 'text-primary' : avg !== null ? 'text-[var(--status-fail)]' : 'text-label-tertiary'}>
                          {predikat}
                        </span>
                      </td>

                      {/* Status KKM */}
                      <td className="px-3 py-2 text-center">
                        {avg === null ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-fill text-label-tertiary font-medium">
                            Kosong
                          </span>
                        ) : passed ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-primary-subtle text-primary border border-primary-border font-semibold">
                            Tuntas
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--status-fail-bg)] text-[var(--status-fail)] border border-[var(--status-fail-border)] font-semibold">
                            Remedial
                          </span>
                        )}
                      </td>

                      {/* Aksi Simpan Per Baris */}
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => saveStudentScores(siswa.id)}
                          disabled={isSavingThis || savingAll}
                          title="Simpan nilai siswa ini"
                          className="p-1.5 rounded-md hover:bg-card-subtle text-label-secondary hover:text-primary transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          {isSavingThis ? (
                            <RefreshCw size={14} className="animate-spin text-primary" />
                          ) : (
                            <Save size={14} className={rowDirty ? 'text-[var(--status-dirty)]' : ''} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Input Nilai Manual Tunggal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-separator shadow-lg relative flex flex-col gap-5">
            <div className="flex items-center justify-between pb-2 border-b border-separator">
              <div>
                <h2 className="text-base font-bold text-label">Input Nilai Siswa Tunggal</h2>
                <p className="text-xs text-label-secondary">Penilaian manual perorangan</p>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-fill text-label-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg flex items-start gap-2 bg-[var(--status-fail-bg)] border border-[var(--status-fail-border)] text-[var(--status-fail)] text-xs">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-label">Pilih Siswa</label>
                <select
                  required
                  value={manualForm.siswaId}
                  onChange={(e) => setManualForm({ ...manualForm, siswaId: e.target.value })}
                  className="h-9 px-3 rounded-lg bg-bg border border-separator text-label text-xs focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {allSiswaList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.nisn}) {s.kelas ? `- Kelas ${s.kelas.nama}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-label">Mata Pelajaran</label>
                <select
                  required
                  value={manualForm.mapelId}
                  onChange={(e) => setManualForm({ ...manualForm, mapelId: e.target.value })}
                  className="h-9 px-3 rounded-lg bg-bg border border-separator text-label text-xs focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">-- Pilih Mapel --</option>
                  {manualMapelList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama} (KKM: {m.kkm})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-label">Semester</label>
                  <select
                    value={manualForm.semester}
                    onChange={(e) => setManualForm({ ...manualForm, semester: e.target.value })}
                    className="h-9 px-3 rounded-lg bg-bg border border-separator text-label text-xs focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="GANJIL">Ganjil</option>
                    <option value="GENAP">Genap</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-label">Tahun Ajaran</label>
                  <input
                    type="text"
                    required
                    value={manualForm.tahunAjaran}
                    onChange={(e) => setManualForm({ ...manualForm, tahunAjaran: e.target.value })}
                    className="h-9 px-3 rounded-lg bg-bg border border-separator text-label text-xs focus:outline-none focus:border-primary"
                    placeholder="2025/2026"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-label-secondary">Tugas (40%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    value={manualForm.tugas}
                    onChange={(e) => setManualForm({ ...manualForm, tugas: e.target.value })}
                    className="h-9 px-2.5 rounded-lg bg-bg border border-separator text-label text-center font-mono text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-label-secondary">UTS (30%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    value={manualForm.uts}
                    onChange={(e) => setManualForm({ ...manualForm, uts: e.target.value })}
                    className="h-9 px-2.5 rounded-lg bg-bg border border-separator text-label text-center font-mono text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-label-secondary">UAS (30%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    value={manualForm.uas}
                    onChange={(e) => setManualForm({ ...manualForm, uas: e.target.value })}
                    className="h-9 px-2.5 rounded-lg bg-bg border border-separator text-label text-center font-mono text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-separator">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="h-9 px-4 rounded-lg text-xs font-semibold text-label-secondary hover:bg-fill transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingManual ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    'Simpan Nilai'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
