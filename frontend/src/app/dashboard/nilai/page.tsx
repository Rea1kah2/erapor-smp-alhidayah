'use client';
import { useState, useEffect, useMemo } from 'react';
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
  X
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
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [allSiswaList, setAllSiswaList] = useState<Siswa[]>([]); // Untuk dropdown modal manual

  // Filter selections
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedMapelId, setSelectedMapelId] = useState<string>('');
  const [semester, setSemester] = useState<string>('GANJIL');
  const [tahunAjaran, setTahunAjaran] = useState<string>('2025/2026');

  // Nilai data states
  const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
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
    tahunAjaran: '2025/2026',
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
        const token = localStorage.getItem('siakad_token');
        const headers = { Authorization: `Bearer ${token}` };

        const [resMe, resKelas, resMapel, resAllSiswa] = await Promise.all([
          fetch('http://localhost:3001/api/auth/me', { headers }),
          fetch('http://localhost:3001/api/master/kelas', { headers }),
          fetch('http://localhost:3001/api/master/mapel', { headers }),
          fetch('http://localhost:3001/api/master/siswa', { headers })
        ]);

        let userRole = 'GURU';
        let guruId: string | undefined;
        if (resMe.ok) {
          const meData = await resMe.json();
          userRole = meData.user?.role || 'GURU';
          guruId = meData.user?.guru?.id;
        }

        if (resKelas.ok) {
          const kData: Kelas[] = await resKelas.json();
          setKelasList(kData);
          if (kData.length > 0) setSelectedKelasId(kData[0].id);
        }

        if (resMapel.ok) {
          const mData: Mapel[] = await resMapel.json();
          // Jika role GURU, filter hanya mapel yang diampunya
          const filteredMapel = userRole === 'GURU' && guruId
            ? mData.filter((m: any) => m.guruId === guruId)
            : mData;

          setMapelList(filteredMapel);
          if (filteredMapel.length > 0) setSelectedMapelId(filteredMapel[0].id);
        }

        if (resAllSiswa.ok) {
          const sData: Siswa[] = await resAllSiswa.json();
          setAllSiswaList(sData);
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

  // Fetch students & scores when filter changes
  const fetchFilterData = async () => {
    if (!selectedKelasId || !selectedMapelId) return;

    setIsLoadingNilai(true);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('siakad_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resSiswa, resNilai] = await Promise.all([
        fetch(`http://localhost:3001/api/master/siswa?kelasId=${selectedKelasId}`, { headers }),
        fetch(
          `http://localhost:3001/api/nilai/mapel?mapelId=${selectedMapelId}&semester=${semester}&tahunAjaran=${encodeURIComponent(tahunAjaran)}&kelasId=${selectedKelasId}`,
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
      }
    } catch (err) {
      console.error('Gagal mengambil data siswa & nilai', err);
      setErrorMsg('Gagal memuat data siswa & nilai untuk filter yang dipilih.');
    } finally {
      setIsLoadingNilai(false);
    }
  };

  useEffect(() => {
    fetchFilterData();
  }, [selectedKelasId, selectedMapelId, semester, tahunAjaran]);

  // Active selected mapel info
  const selectedMapel = useMemo(() => {
    return mapelList.find((m) => m.id === selectedMapelId);
  }, [mapelList, selectedMapelId]);

  // Active selected kelas info
  const selectedKelas = useMemo(() => {
    return kelasList.find((k) => k.id === selectedKelasId);
  }, [kelasList, selectedKelasId]);

  // Handle score change in input
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

  // Upsert a single student's score
  const saveStudentScores = async (siswaId: string) => {
    const studentScores = scores[siswaId];
    if (!studentScores) return;

    setSavingSiswaId(siswaId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('siakad_token');
      const headers = { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      };

      const promises = JENIS_NILAI.map(async (jenis) => {
        const val = studentScores[jenis];
        if (val !== undefined && val !== '') {
          const res = await fetch('http://localhost:3001/api/nilai', {
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
      setSuccessMsg('Nilai siswa berhasil disimpan!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan nilai.');
    } finally {
      setSavingSiswaId(null);
    }
  };

  // Save all students' scores
  const saveAllScores = async () => {
    setSavingAll(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('siakad_token');
      const headers = { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      };

      const promises: Promise<any>[] = [];

      filteredSiswa.forEach((siswa) => {
        const studentScores = scores[siswa.id];
        if (!studentScores) return;

        JENIS_NILAI.forEach((jenis) => {
          const val = studentScores[jenis];
          if (val !== undefined && val !== '') {
            promises.push(
              fetch('http://localhost:3001/api/nilai', {
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
      setSuccessMsg(`Semua nilai untuk kelas ${selectedKelas?.nama || ''} berhasil disimpan!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan semua nilai.');
    } finally {
      setSavingAll(false);
    }
  };

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
      const token = localStorage.getItem('siakad_token');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      const entries = [
        { jenis: 'TUGAS', skor: manualForm.tugas },
        { jenis: 'UTS', skor: manualForm.uts },
        { jenis: 'UAS', skor: manualForm.uas },
      ];

      for (const entry of entries) {
        if (entry.skor !== '') {
          const res = await fetch('http://localhost:3001/api/nilai', {
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
      setSuccessMsg('Data nilai manual berhasil disimpan ke database!');
      setTimeout(() => setSuccessMsg(''), 3000);

      // Refresh filter data jika cocok
      if (manualForm.mapelId === selectedMapelId && manualForm.semester === semester && manualForm.tahunAjaran === tahunAjaran) {
        fetchFilterData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan nilai manual.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const openManualModal = () => {
    setManualForm({
      siswaId: allSiswaList[0]?.id || '',
      mapelId: selectedMapelId || mapelList[0]?.id || '',
      semester: semester || 'GANJIL',
      tahunAjaran: tahunAjaran || '2025/2026',
      tugas: '',
      uts: '',
      uas: ''
    });
    setErrorMsg('');
    setIsManualModalOpen(true);
  };

  // Filtered student list by search input
  const filteredSiswa = useMemo(() => {
    if (!searchQuery.trim()) return siswaList;
    const query = searchQuery.toLowerCase();
    return siswaList.filter(
      (s) => s.nama.toLowerCase().includes(query) || s.nisn.toLowerCase().includes(query)
    );
  }, [siswaList, searchQuery]);

  // Calculate final score: Tugas 30%, UTS 30%, UAS 40%
  const calculateFinal = (studentScores?: Record<string, string>) => {
    if (!studentScores) return { avg: null, passed: false };
    const tugas = studentScores.TUGAS ? Number(studentScores.TUGAS) : null;
    const uts = studentScores.UTS ? Number(studentScores.UTS) : null;
    const uas = studentScores.UAS ? Number(studentScores.UAS) : null;

    if (tugas === null && uts === null && uas === null) {
      return { avg: null, passed: false };
    }

    const tVal = tugas ?? 0;
    const utVal = uts ?? 0;
    const uaVal = uas ?? 0;
    const finalScore = Math.round((tVal * 0.3 + utVal * 0.3 + uaVal * 0.4) * 10) / 10;
    const kkm = selectedMapel?.kkm ?? 75;

    return {
      avg: finalScore,
      passed: finalScore >= kkm,
    };
  };

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
  }, [filteredSiswa, scores, selectedMapel]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-label leading-tight flex items-center gap-2.5">
            <FileSpreadsheet className="text-accent" size={28} />
            Input & Rekap Nilai Siswa
          </h1>
          <p className="text-[15px] text-label-secondary">
            Kelola nilai harian (Tugas), UTS, dan UAS per mata pelajaran dan semester
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={openManualModal}
            className="glass h-11 px-5 rounded-full font-semibold text-accent hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Input Nilai Manual</span>
          </button>

          {filteredSiswa.length > 0 && (
            <button
              onClick={saveAllScores}
              disabled={savingAll || isLoadingNilai}
              className="glass glass-accent h-11 px-6 rounded-full font-semibold text-white flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-md"
            >
              {savingAll ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={18} strokeWidth={2} />
                  <span>Simpan Semua Nilai</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl flex items-center gap-2.5 bg-[color-mix(in_srgb,var(--green)_15%,transparent)] text-label border border-[color-mix(in_srgb,var(--green)_30%,transparent)] shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-[var(--green)] shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && !isManualModalOpen && (
        <div className="p-3.5 rounded-2xl flex items-center gap-2.5 bg-[color-mix(in_srgb,var(--red)_15%,transparent)] text-label border border-[color-mix(in_srgb,var(--red)_30%,transparent)] shadow-sm animate-in fade-in duration-200">
          <AlertCircle size={18} className="text-[var(--red)] shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Filter Card (Liquid Glass) */}
      <section
        className="glass glass-thick p-5 flex flex-col gap-4"
        style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2 text-label font-semibold text-[15px]">
          <Filter size={18} className="text-accent" />
          <span>Filter Data Penilaian</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Kelas Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-label-secondary">Kelas</label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              disabled={isLoadingMaster || kelasList.length === 0}
              className="h-11 px-3.5 rounded-[12px] bg-fill text-label font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all cursor-pointer disabled:opacity-50"
            >
              {kelasList.length === 0 ? (
                <option value="">Belum ada kelas</option>
              ) : (
                kelasList.map((k) => (
                  <option key={k.id} value={k.id} className="bg-bg text-label">
                    {k.nama} (Tingkat {k.tingkat})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Mapel Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-label-secondary">Mata Pelajaran</label>
            <select
              value={selectedMapelId}
              onChange={(e) => setSelectedMapelId(e.target.value)}
              disabled={isLoadingMaster || mapelList.length === 0}
              className="h-11 px-3.5 rounded-[12px] bg-fill text-label font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all cursor-pointer disabled:opacity-50"
            >
              {mapelList.length === 0 ? (
                <option value="">Belum ada mapel</option>
              ) : (
                mapelList.map((m) => (
                  <option key={m.id} value={m.id} className="bg-bg text-label">
                    {m.nama} (KKM: {m.kkm})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Semester Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-label-secondary">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="h-11 px-3.5 rounded-[12px] bg-fill text-label font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all cursor-pointer"
            >
              <option value="GANJIL" className="bg-bg text-label">Semester Ganjil</option>
              <option value="GENAP" className="bg-bg text-label">Semester Genap</option>
            </select>
          </div>

          {/* Tahun Ajaran */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-label-secondary">Tahun Ajaran</label>
            <select
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              className="h-11 px-3.5 rounded-[12px] bg-fill text-label font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all cursor-pointer"
            >
              <option value="2025/2026" className="bg-bg text-label">2025/2026</option>
              <option value="2024/2025" className="bg-bg text-label">2024/2025</option>
              <option value="2026/2027" className="bg-bg text-label">2026/2027</option>
            </select>
          </div>
        </div>
      </section>

      {/* KPI Cards Ringkasan Nilai */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="glass p-4 flex flex-col gap-1.5"
          style={{ '--glass-radius': 'var(--radius-lg)' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-label-secondary uppercase">KKM Mapel</span>
            <Award size={16} className="text-accent" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-label">
            {selectedMapel ? selectedMapel.kkm : '-'}
          </span>
          <span className="text-[11px] text-label-secondary truncate">
            {selectedMapel?.nama || 'Mapel belum dipilih'}
          </span>
        </div>

        <div
          className="glass p-4 flex flex-col gap-1.5"
          style={{ '--glass-radius': 'var(--radius-lg)' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-label-secondary uppercase">Siswa Terdata</span>
            <Layers size={16} className="text-[var(--green)]" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-label">
            {statsSummary.dinilai} / {statsSummary.totalSiswa}
          </span>
          <span className="text-[11px] text-label-secondary">
            {statsSummary.totalSiswa > 0
              ? `${Math.round((statsSummary.dinilai / statsSummary.totalSiswa) * 100)}% telah dinilai`
              : 'Tidak ada siswa'}
          </span>
        </div>

        <div
          className="glass p-4 flex flex-col gap-1.5"
          style={{ '--glass-radius': 'var(--radius-lg)' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-label-secondary uppercase">Rata-rata Kelas</span>
            <TrendingUp size={16} className="text-[#ff9500]" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-label">
            {statsSummary.avgKelas}
          </span>
          <span className="text-[11px] text-label-secondary">
            Skala 0 - 100
          </span>
        </div>

        <div
          className="glass p-4 flex flex-col gap-1.5"
          style={{ '--glass-radius': 'var(--radius-lg)' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-label-secondary uppercase">Ketuntasan</span>
            <BookOpen size={16} className="text-[#af52de]" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-label">
            {statsSummary.percentTuntas}%
          </span>
          <span className="text-[11px] text-label-secondary">
            Mencapai KKM ({statsSummary.kkm})
          </span>
        </div>
      </div>

      {/* Main Table Section */}
      <section className="bg-bg-secondary rounded-[28px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-[0.5px] border-separator">
          <div className="flex items-center gap-2 text-label">
            <span className="font-semibold text-[17px]">
              Daftar Siswa {selectedKelas ? `(${selectedKelas.nama})` : ''}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-fill text-label-secondary font-medium">
              Bobot: Tugas (30%), UTS (30%), UAS (40%)
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary" />
            <input
              type="text"
              placeholder="Cari nama / NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-full bg-fill text-label text-sm placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-all"
            />
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b-[0.5px] border-separator bg-bg/40">
                <th className="px-5 py-3.5 text-[12px] font-semibold text-label-secondary uppercase tracking-wider w-16">
                  No
                </th>
                <th className="px-5 py-3.5 text-[12px] font-semibold text-label-secondary uppercase tracking-wider">
                  Nama Siswa / NISN
                </th>
                <th className="px-4 py-3.5 text-[12px] font-semibold text-label-secondary uppercase tracking-wider w-28 text-center">
                  Tugas (30%)
                </th>
                <th className="px-4 py-3.5 text-[12px] font-semibold text-label-secondary uppercase tracking-wider w-28 text-center">
                  UTS (30%)
                </th>
                <th className="px-4 py-3.5 text-[12px] font-semibold text-label-secondary uppercase tracking-wider w-28 text-center">
                  UAS (40%)
                </th>
                <th className="px-4 py-3.5 text-[12px] font-semibold text-label-secondary uppercase tracking-wider w-28 text-center">
                  Nilai Akhir
                </th>
                <th className="px-4 py-3.5 text-[12px] font-semibold text-label-secondary uppercase tracking-wider w-28 text-center">
                  Status
                </th>
                <th className="px-5 py-3.5 text-[12px] font-semibold text-label-secondary uppercase tracking-wider w-24 text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="text-[14px] text-label divide-y divide-separator/40">
              {isLoadingNilai || isLoadingMaster ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-label-secondary">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-accent" />
                      <span>Memuat data siswa dan nilai...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox size={42} className="text-label-tertiary mb-1" strokeWidth={1.5} />
                      <p className="font-semibold text-[16px]">Tidak ada data siswa ditemukan</p>
                      <p className="text-[13px] text-label-secondary max-w-md mx-auto">
                        Belum ada siswa di kelas ini. Anda dapat menginput nilai secara manual menggunakan tombol <strong>&quot;Input Nilai Manual&quot;</strong> di atas, atau menambahkan siswa di menu Siswa.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSiswa.map((siswa, idx) => {
                  const studentScores = scores[siswa.id] || { TUGAS: '', UTS: '', UAS: '' };
                  const { avg, passed } = calculateFinal(studentScores);
                  const isSavingThis = savingSiswaId === siswa.id;

                  return (
                    <tr
                      key={siswa.id}
                      className="hover:bg-fill/50 transition-colors group"
                    >
                      <td className="px-5 py-3.5 font-medium text-label-secondary tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-label">{siswa.nama}</div>
                        <div className="text-xs text-label-secondary tabular-nums">{siswa.nisn}</div>
                      </td>

                      {/* Input Tugas */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="-"
                          value={studentScores.TUGAS ?? ''}
                          onChange={(e) => handleScoreChange(siswa.id, 'TUGAS', e.target.value)}
                          className="w-20 h-9 text-center rounded-lg bg-fill font-medium text-label tabular-nums focus:outline-none focus:ring-2 focus:ring-accent transition-all placeholder:text-label-tertiary"
                        />
                      </td>

                      {/* Input UTS */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="-"
                          value={studentScores.UTS ?? ''}
                          onChange={(e) => handleScoreChange(siswa.id, 'UTS', e.target.value)}
                          className="w-20 h-9 text-center rounded-lg bg-fill font-medium text-label tabular-nums focus:outline-none focus:ring-2 focus:ring-accent transition-all placeholder:text-label-tertiary"
                        />
                      </td>

                      {/* Input UAS */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="-"
                          value={studentScores.UAS ?? ''}
                          onChange={(e) => handleScoreChange(siswa.id, 'UAS', e.target.value)}
                          className="w-20 h-9 text-center rounded-lg bg-fill font-medium text-label tabular-nums focus:outline-none focus:ring-2 focus:ring-accent transition-all placeholder:text-label-tertiary"
                        />
                      </td>

                      {/* Nilai Akhir */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold tabular-nums text-[15px] ${
                            avg === null
                              ? 'text-label-tertiary'
                              : passed
                              ? 'text-[var(--green)]'
                              : 'text-[var(--red)]'
                          }`}
                        >
                          {avg !== null ? avg : '-'}
                        </span>
                      </td>

                      {/* Status Kelulusan */}
                      <td className="px-4 py-3 text-center">
                        {avg === null ? (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-fill text-label-tertiary font-medium">
                            Belum lengkap
                          </span>
                        ) : passed ? (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,var(--green)_18%,transparent)] text-[var(--green)] font-semibold">
                            Tuntas
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,var(--red)_18%,transparent)] text-[var(--red)] font-semibold">
                            Remedial
                          </span>
                        )}
                      </td>

                      {/* Simpan Per Baris */}
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => saveStudentScores(siswa.id)}
                          disabled={isSavingThis || savingAll}
                          title="Simpan nilai siswa ini"
                          className="p-2 rounded-full hover:bg-fill text-label-secondary hover:text-accent transition-colors active:scale-95 disabled:opacity-40"
                        >
                          {isSavingThis ? (
                            <RefreshCw size={16} className="animate-spin text-accent" />
                          ) : (
                            <Save size={16} />
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

      {/* Modal Input Nilai Manual */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="glass glass-thick w-full max-w-lg p-6 relative flex flex-col gap-6"
            style={{ '--glass-radius': 'var(--radius-2xl)' } as React.CSSProperties}
          >
            <button
              onClick={() => setIsManualModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-fill transition-colors text-label-secondary"
            >
              <X size={22} />
            </button>

            <div>
              <h2 className="text-[22px] font-semibold text-label">Input Nilai Siswa Manual</h2>
              <p className="text-[14px] text-label-secondary">
                Pilih siswa dan mata pelajaran secara spesifik untuk memasukkan nilai tugas, UTS, atau UAS.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg flex items-start gap-2 bg-[color-mix(in_srgb,var(--red)_12%,transparent)] text-label">
                <AlertCircle size={18} className="text-[var(--red)] mt-0.5 shrink-0" />
                <p className="text-sm font-medium">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
              {/* Pilih Siswa */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-medium text-label">Pilih Siswa</label>
                <select
                  required
                  value={manualForm.siswaId}
                  onChange={(e) => setManualForm({ ...manualForm, siswaId: e.target.value })}
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {allSiswaList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-bg text-label">
                      {s.nama} ({s.nisn}) {s.kelas ? `- Kelas: ${s.kelas.nama}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pilih Mapel */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-medium text-label">Mata Pelajaran</label>
                <select
                  required
                  value={manualForm.mapelId}
                  onChange={(e) => setManualForm({ ...manualForm, mapelId: e.target.value })}
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                >
                  <option value="">-- Pilih Mapel --</option>
                  {mapelList.map((m) => (
                    <option key={m.id} value={m.id} className="bg-bg text-label">
                      {m.nama} (KKM: {m.kkm})
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester & Tahun Ajaran */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] font-medium text-label">Semester</label>
                  <select
                    value={manualForm.semester}
                    onChange={(e) => setManualForm({ ...manualForm, semester: e.target.value })}
                    className="h-11 px-3 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                  >
                    <option value="GANJIL" className="bg-bg text-label">Ganjil</option>
                    <option value="GENAP" className="bg-bg text-label">Genap</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] font-medium text-label">Tahun Ajaran</label>
                  <input
                    type="text"
                    required
                    value={manualForm.tahunAjaran}
                    onChange={(e) => setManualForm({ ...manualForm, tahunAjaran: e.target.value })}
                    className="h-11 px-3 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="2025/2026"
                  />
                </div>
              </div>

              {/* Kolom Nilai: Tugas, UTS, UAS */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-label-secondary">Tugas (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Contoh: 85"
                    value={manualForm.tugas}
                    onChange={(e) => setManualForm({ ...manualForm, tugas: e.target.value })}
                    className="h-11 px-3 rounded-[12px] bg-fill text-label text-center font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-label-secondary">UTS (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Contoh: 80"
                    value={manualForm.uts}
                    onChange={(e) => setManualForm({ ...manualForm, uts: e.target.value })}
                    className="h-11 px-3 rounded-[12px] bg-fill text-label text-center font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-label-secondary">UAS (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Contoh: 90"
                    value={manualForm.uas}
                    onChange={(e) => setManualForm({ ...manualForm, uas: e.target.value })}
                    className="h-11 px-3 rounded-[12px] bg-fill text-label text-center font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="h-11 px-5 rounded-full font-semibold text-label hover:bg-fill transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="glass glass-accent h-11 px-6 rounded-full font-semibold text-white active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingManual ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
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
