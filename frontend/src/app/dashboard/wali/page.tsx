// frontend/src/app/dashboard/wali/page.tsx
'use client';
import { apiFetch } from "@/lib/api";
import { errorMessage } from '@/lib/errors';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  Printer, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  School, 
  TrendingUp,
  X,
  Plus,
  Trash2,
  Layers,
  Crown,
  ArrowRight
} from 'lucide-react';
import PrintableRapor, { RaporData } from '../components/PrintableRapor';
import { useAcademicYear } from '@/lib/AcademicYearContext';

interface SiswaRekap {
  siswaId: string;
  nama: string;
  nisn: string;
  rataRata: number;
  ranking: number;
  totalSiswa: number;
  mapelDinilaiCount: number;
  nilaiMapel: Array<{
    mapelId: string;
    namaMapel: string;
    kkm: number;
    guru: string;
    tugas: number | null;
    uts: number | null;
    uas: number | null;
    nilaiAkhir: number;
    predikat: string;
    status: string;
  }>;
  catatanRapor: {
    sakit: number;
    izin: number;
    alfa: number;
    sikapSpiritual: string | null;
    deskripsiSpiritual: string | null;
    sikapSosial: string | null;
    deskripsiSosial: string | null;
    ekskul: EkskulItem[];
    catatanWali: string;
    statusKenaikan?: string | null;
  } | null;
}

interface EkskulItem { nama: string; predikat: string; keterangan: string; }
interface KelasSummary {
  id: string;
  nama: string;
  tingkat: number;
  wali?: { id: string; nama: string; nip?: string | null } | null;
  _count?: { siswa?: number; riwayatSiswa?: number };
}
interface MapelSummary {
  id: string;
  nama: string;
  kkm: number;
  guru?: { nama: string } | null;
}

type ModalTabKey = 'presensi' | 'sikap' | 'ekskul' | 'wali';

export default function WaliKelasPage() {
  const { semester, tahunAjaran, setSemester, setTahunAjaran, yearOptions } = useAcademicYear();

  const [kelasData, setKelasData] = useState<KelasSummary | null>(null);
  const [kelasListAdmin, setKelasListAdmin] = useState<KelasSummary[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [isWali, setIsWali] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string>('GURU');

  const [rekapList, setRekapList] = useState<SiswaRekap[]>([]);
  const [mapelList, setMapelList] = useState<MapelSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Notifikasi
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Active Tab Modal Catatan
  const [activeModalTab, setActiveModalTab] = useState<ModalTabKey>('presensi');

  // Modal Catatan Rapor
  const [editingSiswa, setEditingSiswa] = useState<SiswaRekap | null>(null);
  const [formCatatan, setFormCatatan] = useState<{
    sakit: number;
    izin: number;
    alfa: number;
    sikapSpiritual: string;
    deskripsiSpiritual: string;
    sikapSosial: string;
    deskripsiSosial: string;
    ekskul: EkskulItem[];
    catatanWali: string;
    statusKenaikan: string;
  }>({
    sakit: 0,
    izin: 0,
    alfa: 0,
    sikapSpiritual: '',
    deskripsiSpiritual: '',
    sikapSosial: '',
    deskripsiSosial: '',
    ekskul: [],
    catatanWali: '',
    statusKenaikan: ''
  });
  const [isSavingCatatan, setIsSavingCatatan] = useState<boolean>(false);

  // Modal Cetak Rapor
  const [printData, setPrintData] = useState<RaporData | null>(null);
  const [isLoadingPrint, setIsLoadingPrint] = useState<boolean>(false);

  // Ambil rekapitulasi nilai dan catatan rapor kelas
  const fetchRekap = useCallback(async (kelasId: string, sem: string, thn: string) => {
    if (!kelasId || !thn) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const url = `/api/wali/rekap?kelasId=${kelasId}&semester=${sem}&tahunAjaran=${encodeURIComponent(thn)}`;
      const res = await apiFetch(url);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengambil rekapitulasi kelas');
      }

      const data = await res.json();
      setRekapList(data.rekap || []);
      setMapelList(data.mapelList || []);
      setKelasData(data.kelas);
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal memuat rekap kelas.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchKelasBinaan = useCallback(async () => {
    if (!tahunAjaran) return;
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/wali/kelas-binaan?tahunAjaran=${encodeURIComponent(tahunAjaran)}`);
      if (!res.ok) throw new Error('Gagal mengambil data penugasan wali kelas');
      const data = await res.json();
      setUserRole(String(data.role || 'GURU'));
      setIsWali(data.isWali);

      if (data.role === 'ADMIN') {
        const list = data.kelasList || [];
        setKelasListAdmin(list);
        const targetId = selectedKelasId && list.some((k: KelasSummary) => k.id === selectedKelasId) 
          ? selectedKelasId 
          : list[0]?.id;
        if (targetId) {
          setSelectedKelasId(targetId);
          await fetchRekap(targetId, semester, tahunAjaran);
        }
      } else if (data.kelas) {
        setKelasListAdmin(data.kelasList || [data.kelas]);
        setKelasData(data.kelas);
        setSelectedKelasId(data.kelas.id);
        await fetchRekap(data.kelas.id, semester, tahunAjaran);
      } else {
        setIsWali(false);
      }
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal memuat penugasan wali kelas.'));
    } finally {
      setIsLoading(false);
    }
  }, [tahunAjaran, semester, selectedKelasId, fetchRekap]);

  useEffect(() => {
    queueMicrotask(() => { void fetchKelasBinaan(); });
  }, [fetchKelasBinaan]);

  const handleClassSelect = (kId: string) => {
    setSelectedKelasId(kId);
    void fetchRekap(kId, semester, tahunAjaran);
  };

  // Helper evaluasi status kelengkapan catatan rapor
  const getCatatanCompleteness = (catatan: SiswaRekap['catatanRapor']): 'lengkap' | 'parsial' | 'kosong' => {
    if (!catatan) return 'kosong';
    const hasPresensi = (catatan.sakit ?? 0) > 0 || (catatan.izin ?? 0) > 0 || (catatan.alfa ?? 0) > 0;
    const hasSikap = !!catatan.sikapSpiritual && !!catatan.sikapSosial;
    const hasWali = !!catatan.catatanWali && catatan.catatanWali.trim().length > 0;

    const count = (hasPresensi ? 1 : 0) + (hasSikap ? 1 : 0) + (hasWali ? 1 : 0);
    if (count === 3) return 'lengkap';
    if (count > 0) return 'parsial';
    return 'kosong';
  };

  // Buka Modal Catatan
  const openCatatanModal = (siswa: SiswaRekap) => {
    setEditingSiswa(siswa);
    setActiveModalTab('presensi');
    setErrorMsg('');
    setSuccessMsg('');

    const cr = siswa.catatanRapor;
    if (cr) {
      setFormCatatan({
        sakit: cr.sakit || 0,
        izin: cr.izin || 0,
        alfa: cr.alfa || 0,
        sikapSpiritual: cr.sikapSpiritual || '',
        deskripsiSpiritual: cr.deskripsiSpiritual || '',
        sikapSosial: cr.sikapSosial || '',
        deskripsiSosial: cr.deskripsiSosial || '',
        ekskul: Array.isArray(cr.ekskul) ? [...cr.ekskul] : [],
        catatanWali: cr.catatanWali || '',
        statusKenaikan: cr.statusKenaikan || ''
      });
    } else {
      setFormCatatan({
        sakit: 0,
        izin: 0,
        alfa: 0,
        sikapSpiritual: '',
        deskripsiSpiritual: '',
        sikapSosial: '',
        deskripsiSosial: '',
        ekskul: [],
        catatanWali: '',
        statusKenaikan: ''
      });
    }
  };

  // Handle Simpan Catatan Rapor
  const handleSaveCatatan = async (e?: React.FormEvent, andClose = false) => {
    if (e) e.preventDefault();
    if (!editingSiswa || !selectedKelasId) return;

    setIsSavingCatatan(true);
    setErrorMsg('');

    try {
      const payload = {
        siswaId: editingSiswa.siswaId,
        kelasId: selectedKelasId,
        semester,
        tahunAjaran,
        ...formCatatan
      };

      const res = await apiFetch('/api/wali/catatan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan catatan rapor');

      setSuccessMsg(`Catatan rapor untuk ${editingSiswa.nama} berhasil disimpan!`);
      setTimeout(() => setSuccessMsg(''), 3000);

      // Perbarui state lokal
      setRekapList((prev) =>
        prev.map((item) =>
          item.siswaId === editingSiswa.siswaId
            ? { ...item, catatanRapor: data.data }
            : item
        )
      );

      if (andClose) {
        setEditingSiswa(null);
      }
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal menyimpan catatan.'));
    } finally {
      setIsSavingCatatan(false);
    }
  };

  const handleSaveAndNext = async () => {
    await handleSaveCatatan(undefined, false);
    if (activeModalTab === 'presensi') setActiveModalTab('sikap');
    else if (activeModalTab === 'sikap') setActiveModalTab('ekskul');
    else if (activeModalTab === 'ekskul') setActiveModalTab('wali');
  };

  // Manipulasi Ekskul Form
  const handleAddEkskul = () => {
    setFormCatatan((prev) => ({
      ...prev,
      ekskul: [...prev.ekskul, { nama: '', predikat: 'A', keterangan: '' }]
    }));
  };

  const handleUpdateEkskul = (index: number, field: keyof EkskulItem, value: string) => {
    setFormCatatan((prev) => {
      const updated = [...prev.ekskul];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, ekskul: updated };
    });
  };

  const handleRemoveEkskul = (index: number) => {
    setFormCatatan((prev) => ({
      ...prev,
      ekskul: prev.ekskul.filter((_, idx) => idx !== index)
    }));
  };

  // Buka Modal Cetak Rapor
  const handleOpenPrint = async (siswaId: string) => {
    setIsLoadingPrint(true);
    setErrorMsg('');
    try {
      const url = `/api/wali/rapor/${siswaId}?semester=${semester}&tahunAjaran=${encodeURIComponent(tahunAjaran)}`;
      const res = await apiFetch(url);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengambil data rapor cetak');
      }

      const data = await res.json();
      setPrintData(data);
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal mempersiapkan lembar rapor untuk cetak.'));
    } finally {
      setIsLoadingPrint(false);
    }
  };

  // Filtered Siswa List
  const filteredRekap = useMemo(() => {
    if (!searchQuery.trim()) return rekapList;
    const q = searchQuery.toLowerCase();
    return rekapList.filter(
      (s) => s.nama.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q)
    );
  }, [rekapList, searchQuery]);

  // Statistik Kelas
  const rataRataKelas = useMemo(() => {
    if (rekapList.length === 0) return 0;
    const sum = rekapList.reduce((acc, curr) => acc + curr.rataRata, 0);
    return Math.round((sum / rekapList.length) * 10) / 10;
  }, [rekapList]);

  const topThree = useMemo(() => {
    return [...rekapList].sort((a, b) => a.ranking - b.ranking).slice(0, 3);
  }, [rekapList]);

  // Status kelengkapan tab modal saat ini
  const tabStatus = useMemo(() => {
    const presensiDone = formCatatan.sakit > 0 || formCatatan.izin > 0 || formCatatan.alfa > 0;
    const sikapDone = !!formCatatan.sikapSpiritual && !!formCatatan.sikapSosial;
    const ekskulDone = formCatatan.ekskul.length > 0;
    const waliDone = formCatatan.catatanWali.trim().length > 0;

    return { presensi: presensiDone, sikap: sikapDone, ekskul: ekskulDone, wali: waliDone };
  }, [formCatatan]);

  if (!isWali && userRole !== 'ADMIN') {
    return (
      <div className="bg-card rounded-xl border border-separator p-8 text-center flex flex-col items-center gap-3">
        <School size={36} className="text-amber-600" />
        <h2 className="text-lg font-bold text-label">Bukan Wali Kelas</h2>
        <p className="text-xs text-label-secondary max-w-md">
          Akun Anda tidak tercatat sebagai wali kelas aktif pada tahun ajaran ini. Anda dapat menginput nilai pada mata pelajaran yang Anda ampu melalui menu <strong>Input Nilai</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Banner */}
      <div className="bg-card rounded-xl border border-separator p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Rekapitulasi Wali Kelas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label">
            Leger Nilai, Catatan & Cetak Rapor
          </h1>
          <p className="text-sm text-label-secondary mt-1">
            Kelas {kelasData?.nama || '-'} &bull; Semester {semester === 'GANJIL' ? 'Ganjil' : 'Genap'} &bull; Tahun Ajaran {tahunAjaran}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {(userRole === 'ADMIN' || kelasListAdmin.length > 1) && kelasListAdmin.length > 0 && (
            <select
              value={selectedKelasId}
              onChange={(e) => handleClassSelect(e.target.value)}
              className="h-9 px-3 rounded-lg bg-card border border-separator text-label text-xs font-semibold focus:border-primary outline-none cursor-pointer"
            >
              {kelasListAdmin.map(k => (
                <option key={k.id} value={k.id}>Kelas {k.nama} (Tingkat {k.tingkat})</option>
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
            onClick={() => fetchRekap(selectedKelasId, semester, tahunAjaran)}
            className="p-2 rounded-lg border border-separator bg-card hover:bg-card-subtle text-label-secondary transition-colors cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded-lg flex items-center gap-2.5 bg-primary-subtle border border-primary-border text-primary text-xs font-medium animate-in fade-in duration-150">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-lg flex items-center gap-2.5 bg-[var(--status-fail-bg)] border border-[var(--status-fail-border)] text-[var(--status-fail)] text-xs font-medium animate-in fade-in duration-150">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top 3 Rankings Showcase (Podium) */}
      {topThree.length > 0 && topThree[0].rataRata > 0 && (
        <div className="bg-card rounded-xl border border-separator p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-accent" />
            <span className="text-xs font-bold text-label-secondary uppercase tracking-wider">
              Peringkat Terbaik Kelas {kelasData?.nama}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topThree.map((siswa, idx) => (
              <div 
                key={siswa.siswaId} 
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  idx === 0 
                    ? 'bg-amber-500/10 border-amber-500/30' 
                    : idx === 1 
                    ? 'bg-slate-300/15 border-slate-300/40' 
                    : 'bg-amber-700/10 border-amber-700/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : 'bg-amber-700 text-white'
                  }`}>
                    {siswa.ranking}
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-label leading-tight">{siswa.nama}</h3>
                    <span className="text-[10px] text-label-secondary font-mono">{siswa.nisn}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-primary tabular-nums">
                    {siswa.rataRata}
                  </span>
                  <div className="text-[10px] text-label-secondary">Rata-rata</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Class Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Siswa</span>
            <Users size={14} className="text-primary" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-label">{rekapList.length}</span>
          <span className="text-[11px] text-label-secondary">Peserta Didik Terdaftar</span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Rata-Rata Kelas</span>
            <TrendingUp size={14} className="text-accent" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-label">{rataRataKelas}</span>
          <span className="text-[11px] text-label-secondary">Akumulasi Nilai Akhir</span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Wali Kelas</span>
            <School size={14} className="text-primary" />
          </div>
          <span className="text-base font-bold text-label truncate">
            {kelasData?.wali?.nama || 'Belum Ditetapkan'}
          </span>
          <span className="text-[11px] text-label-secondary font-mono">
            {kelasData?.wali?.nip ? `NIP: ${kelasData.wali.nip}` : 'NIP: -'}
          </span>
        </div>

        <div className="bg-card border border-separator rounded-xl p-3.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Mata Pelajaran</span>
            <Layers size={14} className="text-accent" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-label">{mapelList.length}</span>
          <span className="text-[11px] text-label-secondary">Kurikulum Terdaftar</span>
        </div>
      </div>

      {/* Recapitulation Table Section */}
      <section className="bg-card rounded-xl border border-separator shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Toolbar */}
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-separator bg-bg/50">
          <span className="font-semibold text-sm text-label">
            Leger Nilai & Rekapitulasi Rapor ({filteredRekap.length} Siswa)
          </span>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary" />
            <input 
              type="text"
              placeholder="Cari siswa atau NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-bg border border-separator text-label text-xs placeholder:text-label-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead className="sticky top-0 z-20 bg-card border-b border-separator shadow-xs">
              <tr className="text-xs font-semibold text-label-secondary uppercase tracking-wider">
                <th className="px-4 py-3 text-center w-14">Rank</th>
                <th className="px-4 py-3 min-w-[200px]">Nama Peserta Didik</th>
                <th className="px-3 py-3 w-32 font-mono">NISN</th>
                <th className="px-3 py-3 text-center w-28">Rata-Rata (NA)</th>
                <th className="px-3 py-3 text-center w-32">Presensi (S/I/A)</th>
                <th className="px-3 py-3 text-center w-36">Kelengkapan Catatan</th>
                <th className="px-4 py-3 text-right w-44">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-separator">
              {filteredRekap.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-label-secondary text-xs">
                    Tidak ada siswa ditemukan di kelas ini.
                  </td>
                </tr>
              ) : (
                filteredRekap.map((item) => {
                  const catatan = item.catatanRapor;
                  const presensiText = catatan
                    ? `${catatan.sakit}S / ${catatan.izin}I / ${catatan.alfa}A`
                    : '-';
                  const completeness = getCatatanCompleteness(catatan);

                  return (
                    <tr key={item.siswaId} className="hover:bg-bg/60 transition-colors">
                      <td className="px-4 py-2.5 text-center font-bold font-mono">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                          item.ranking === 1 ? 'bg-amber-400 text-white font-extrabold' :
                          item.ranking === 2 ? 'bg-slate-400 text-white font-extrabold' :
                          item.ranking === 3 ? 'bg-amber-700 text-white font-extrabold' :
                          'text-label-secondary bg-fill'
                        }`}>
                          {item.ranking}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 font-medium text-label text-sm">
                        {item.nama}
                      </td>

                      <td className="px-3 py-2.5 font-mono text-xs text-label-secondary tabular-nums">
                        {item.nisn}
                      </td>

                      <td className="px-3 py-2.5 text-center font-bold font-mono text-sm tabular-nums">
                        <span className={item.rataRata >= 75 ? 'text-primary' : 'text-accent'}>
                          {item.rataRata}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-center font-mono text-xs text-label-secondary tabular-nums">
                        {presensiText}
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        {completeness === 'lengkap' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
                            Lengkap
                          </span>
                        ) : completeness === 'parsial' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Parsial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-fill text-label-tertiary border border-separator/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Belum Diisi
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openCatatanModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-separator bg-bg hover:bg-card-subtle text-label text-xs font-medium transition-colors cursor-pointer"
                            title="Input Presensi, Sikap, Ekskul, dan Catatan Wali"
                          >
                            <Edit3 size={13} />
                            <span>Catatan</span>
                          </button>

                          <button
                            onClick={() => handleOpenPrint(item.siswaId)}
                            disabled={isLoadingPrint}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                            title="Cetak Lembar Rapor Siswa"
                          >
                            <Printer size={13} />
                            <span>Rapor</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Stepped Tabulasi Catatan Rapor */}
      {editingSiswa && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-xl rounded-2xl border border-separator shadow-xl p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-separator pb-3">
              <div>
                <h2 className="text-base font-bold text-label">
                  Catatan Rapor: {editingSiswa.nama}
                </h2>
                <p className="text-xs text-label-secondary">
                  NISN {editingSiswa.nisn} &bull; Kelas {kelasData?.nama} &bull; Semester {semester} {tahunAjaran}
                </p>
              </div>
              <button 
                onClick={() => setEditingSiswa(null)}
                className="p-1.5 rounded-lg hover:bg-fill text-label-secondary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepped Tab Navigasi Modal dengan Progress Indicators */}
            <div className="grid grid-cols-4 gap-1.5 border-b border-separator pb-3">
              {(
                [
                  { key: 'presensi', label: '1. Presensi', done: tabStatus.presensi },
                  { key: 'sikap', label: '2. Sikap', done: tabStatus.sikap },
                  { key: 'ekskul', label: '3. Ekskul', done: tabStatus.ekskul },
                  { key: 'wali', label: '4. Bimbingan', done: tabStatus.wali },
                ] as const
              ).map((tab) => {
                const isActive = activeModalTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveModalTab(tab.key)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white shadow-xs'
                        : tab.done
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50'
                        : 'bg-fill/60 text-label-secondary hover:text-label hover:bg-fill'
                    }`}
                  >
                    {tab.done && !isActive && <CheckCircle2 size={13} className="text-emerald-600" />}
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={(e) => handleSaveCatatan(e, true)} className="flex flex-col gap-4">
              
              {/* TAB 1: PRESENSI */}
              {activeModalTab === 'presensi' && (
                <div className="flex flex-col gap-3 py-1 animate-in fade-in duration-150">
                  <span className="text-xs text-label-secondary">
                    Rekapitulasi hari ketidakhadiran siswa selama satu semester berjalan:
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-label">Sakit (Hari)</label>
                      <input 
                        type="number"
                        min={0}
                        value={formCatatan.sakit}
                        onChange={(e) => setFormCatatan({ ...formCatatan, sakit: Number(e.target.value) })}
                        className="h-10 px-3 rounded-lg bg-bg border border-separator text-label font-mono text-center text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-label">Izin (Hari)</label>
                      <input 
                        type="number"
                        min={0}
                        value={formCatatan.izin}
                        onChange={(e) => setFormCatatan({ ...formCatatan, izin: Number(e.target.value) })}
                        className="h-10 px-3 rounded-lg bg-bg border border-separator text-label font-mono text-center text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-label">Alfa (Hari)</label>
                      <input 
                        type="number"
                        min={0}
                        value={formCatatan.alfa}
                        onChange={(e) => setFormCatatan({ ...formCatatan, alfa: Number(e.target.value) })}
                        className="h-10 px-3 rounded-lg bg-bg border border-separator text-label font-mono text-center text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SIKAP */}
              {activeModalTab === 'sikap' && (
                <div className="flex flex-col gap-3 py-1 animate-in fade-in duration-150">
                  {/* Spiritual */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-bg border border-separator">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-label">Sikap Spiritual</label>
                      <select
                        value={formCatatan.sikapSpiritual}
                        onChange={(e) => setFormCatatan({ ...formCatatan, sikapSpiritual: e.target.value })}
                        className="h-8 px-2 rounded-md bg-card border border-separator text-label text-xs font-bold outline-none focus:border-primary cursor-pointer"
                      >
                        <option value="">Belum dinilai</option>
                        <option value="A">A (Sangat Baik)</option>
                        <option value="B">B (Baik)</option>
                        <option value="C">C (Cukup)</option>
                        <option value="D">D (Kurang)</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={formCatatan.deskripsiSpiritual}
                      onChange={(e) => setFormCatatan({ ...formCatatan, deskripsiSpiritual: e.target.value })}
                      placeholder="Contoh: Sangat taat beribadah dan aktif dalam kegiatan sholat berjamaah..."
                      className="h-8 px-3 rounded-md bg-card border border-separator text-label text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Sosial */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-bg border border-separator">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-label">Sikap Sosial</label>
                      <select
                        value={formCatatan.sikapSosial}
                        onChange={(e) => setFormCatatan({ ...formCatatan, sikapSosial: e.target.value })}
                        className="h-8 px-2 rounded-md bg-card border border-separator text-label text-xs font-bold outline-none focus:border-primary cursor-pointer"
                      >
                        <option value="">Belum dinilai</option>
                        <option value="A">A (Sangat Baik)</option>
                        <option value="B">B (Baik)</option>
                        <option value="C">C (Cukup)</option>
                        <option value="D">D (Kurang)</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={formCatatan.deskripsiSosial}
                      onChange={(e) => setFormCatatan({ ...formCatatan, deskripsiSosial: e.target.value })}
                      placeholder="Contoh: Menunjukkan sikap santun, disiplin, dan gotong royong yang tinggi..."
                      className="h-8 px-3 rounded-md bg-card border border-separator text-label text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: EKSTRAKURIKULER */}
              {activeModalTab === 'ekskul' && (
                <div className="flex flex-col gap-3 py-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-label-secondary">
                      Daftar kegiatan pengembangan diri / ekstrakurikuler:
                    </span>
                    <button
                      type="button"
                      onClick={handleAddEkskul}
                      className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus size={14} /> Tambah Kegiatan
                    </button>
                  </div>

                  {formCatatan.ekskul.length === 0 ? (
                    <p className="text-xs text-label-tertiary italic py-3 text-center">
                      Belum ada kegiatan ekstrakurikuler ditambahkan.
                    </p>
                  ) : (
                    formCatatan.ekskul.map((eks, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nama Ekskul (misal: Pramuka)"
                          value={eks.nama}
                          onChange={(e) => handleUpdateEkskul(idx, 'nama', e.target.value)}
                          className="flex-1 h-8 px-2.5 rounded-md bg-bg border border-separator text-label text-xs focus:border-primary"
                          required
                        />
                        <select
                          value={eks.predikat}
                          onChange={(e) => handleUpdateEkskul(idx, 'predikat', e.target.value)}
                          className="w-14 h-8 px-1.5 rounded-md bg-bg border border-separator text-label text-xs font-bold focus:border-primary"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Keterangan singkat..."
                          value={eks.keterangan}
                          onChange={(e) => handleUpdateEkskul(idx, 'keterangan', e.target.value)}
                          className="flex-1 h-8 px-2.5 rounded-md bg-bg border border-separator text-label text-xs focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveEkskul(idx)}
                          className="p-1.5 text-[var(--status-fail)] hover:bg-[var(--status-fail-bg)] rounded-md transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: CATATAN WALI & KENAIKAN */}
              {activeModalTab === 'wali' && (
                <div className="flex flex-col gap-3 py-1 animate-in fade-in duration-150">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-label">
                      Catatan Bimbingan & Motivasi Wali Kelas
                    </label>
                    <textarea
                      rows={3}
                      value={formCatatan.catatanWali}
                      onChange={(e) => setFormCatatan({ ...formCatatan, catatanWali: e.target.value })}
                      placeholder="Tuliskan pesan motivasi atau bimbingan akademik bagi siswa..."
                      className="w-full p-2.5 rounded-lg bg-bg border border-separator text-label text-xs focus:outline-none focus:border-primary resize-none"
                      required
                    />
                  </div>

                  {semester === 'GENAP' && (
                    <div className="flex flex-col gap-1 pt-2 border-t border-separator">
                      <label className="text-xs font-semibold text-label">
                        Keputusan Kenaikan Kelas / Kelulusan
                      </label>
                      <input
                        type="text"
                        value={formCatatan.statusKenaikan}
                        onChange={(e) => setFormCatatan({ ...formCatatan, statusKenaikan: e.target.value })}
                        placeholder="Contoh: Naik ke Kelas VIII / Lulus dari SMP Al-Hidayah"
                        className="w-full h-9 px-3 rounded-lg bg-bg border border-separator text-label text-xs focus:outline-none focus:border-primary font-semibold"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons dengan Simpan & Lanjut */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-separator">
                <button
                  type="button"
                  onClick={() => setEditingSiswa(null)}
                  className="h-9 px-4 rounded-lg text-xs font-semibold text-label-secondary hover:bg-fill transition-colors cursor-pointer"
                >
                  Tutup
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveCatatan(undefined, false)}
                    disabled={isSavingCatatan}
                    className="h-9 px-3.5 rounded-lg border border-separator hover:bg-card-subtle text-xs font-semibold text-label transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Simpan Saja
                  </button>

                  {activeModalTab !== 'wali' ? (
                    <button
                      type="button"
                      onClick={handleSaveAndNext}
                      disabled={isSavingCatatan}
                      className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <span>Simpan & Lanjut</span>
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSavingCatatan}
                      className="h-9 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      <span>Selesai & Tutup</span>
                    </button>
                  )}
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

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
