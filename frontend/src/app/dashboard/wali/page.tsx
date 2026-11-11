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
  Award,
  Crown
} from 'lucide-react';
import PrintableRapor, { RaporData } from '../components/PrintableRapor';

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

export default function WaliKelasPage() {
  const [kelasData, setKelasData] = useState<KelasSummary | null>(null);
  const [kelasListAdmin, setKelasListAdmin] = useState<KelasSummary[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [isWali, setIsWali] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string>('GURU');

  const [semester, setSemester] = useState<string>('GANJIL');
  const [tahunAjaran, setTahunAjaran] = useState<string>('');
  const [yearOptions, setYearOptions] = useState<string[]>([]);

  const [rekapList, setRekapList] = useState<SiswaRekap[]>([]);
  const [mapelList, setMapelList] = useState<MapelSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Notifikasi
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Active Tab Modal Catatan
  const [activeModalTab, setActiveModalTab] = useState<'presensi' | 'sikap' | 'ekskul' | 'wali'>('presensi');

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
    if (!kelasId) return;
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

  const fetchKelasBinaan = useCallback(async (requestedYear?: string, selectedSemester = 'GANJIL') => {
    setIsLoading(true);
    try {
      const yearsResponse = await apiFetch('/api/master/tahun-ajaran');
      const years: Array<{ nama: string; aktif: boolean }> = yearsResponse.ok ? await yearsResponse.json() : [];
      const activeYear = years.find((year) => year.aktif)?.nama || years[0]?.nama;
      const year = requestedYear || activeYear;
      if (years.length) setYearOptions(years.map((item) => item.nama));
      if (year) setTahunAjaran(year);
      if (!year) throw new Error('Tahun ajaran belum dibuat oleh administrator.');

      const res = await apiFetch(`/api/wali/kelas-binaan?tahunAjaran=${encodeURIComponent(year)}`);
      if (!res.ok) throw new Error('Gagal mengambil data penugasan wali kelas');
      const data = await res.json();
      setUserRole(String(data.role || 'GURU'));
      setIsWali(data.isWali);

      if (data.role === 'ADMIN') {
        setKelasListAdmin(data.kelasList || []);
        const defaultId = data.kelasList?.[0]?.id;
        if (defaultId) {
          setSelectedKelasId(defaultId);
          await fetchRekap(defaultId, selectedSemester, year);
        }
      } else if (data.kelas) {
        setKelasListAdmin(data.kelasList || [data.kelas]);
        setKelasData(data.kelas);
        setSelectedKelasId(data.kelas.id);
        await fetchRekap(data.kelas.id, selectedSemester, year);
      } else {
        setIsWali(false);
      }
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal memuat penugasan wali kelas.'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchRekap]);

  useEffect(() => {
    queueMicrotask(() => { void fetchKelasBinaan(); });
  }, [fetchKelasBinaan]);

  const handleFilterChange = (newSem: string, newThn: string, newKelasId?: string) => {
    const kId = newKelasId !== undefined ? newKelasId : selectedKelasId;
    setSemester(newSem);
    setTahunAjaran(newThn);
    if (newKelasId !== undefined) setSelectedKelasId(newKelasId);
    if (newThn !== tahunAjaran) {
      fetchKelasBinaan(newThn, newSem);
      return;
    }
    fetchRekap(kId, newSem, newThn);
  };

  const openCatatanModal = (item: SiswaRekap) => {
    setEditingSiswa(item);
    setActiveModalTab('presensi');
    const existing = item.catatanRapor;
    if (existing) {
      setFormCatatan({
        sakit: existing.sakit || 0,
        izin: existing.izin || 0,
        alfa: existing.alfa || 0,
        sikapSpiritual: existing.sikapSpiritual || '',
        deskripsiSpiritual: existing.deskripsiSpiritual || '',
        sikapSosial: existing.sikapSosial || '',
        deskripsiSosial: existing.deskripsiSosial || '',
        ekskul: Array.isArray(existing.ekskul) ? existing.ekskul : [],
        catatanWali: existing.catatanWali || '',
        statusKenaikan: existing.statusKenaikan || ''
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

  const handleSaveCatatan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSiswa) return;
    setIsSavingCatatan(true);
    try {
      const res = await apiFetch('/api/wali/catatan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siswaId: editingSiswa.siswaId,
          semester,
          tahunAjaran,
          ...formCatatan
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan catatan rapor');
      }

      setEditingSiswa(null);
      setSuccessMsg(`Catatan rapor untuk ${editingSiswa.nama} berhasil disimpan!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchRekap(selectedKelasId, semester, tahunAjaran);
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal menyimpan catatan rapor.'));
    } finally {
      setIsSavingCatatan(false);
    }
  };

  const handleAddEkskul = () => {
    setFormCatatan(prev => ({
      ...prev,
      ekskul: [...prev.ekskul, { nama: '', predikat: 'A', keterangan: '' }]
    }));
  };

  const handleRemoveEkskul = (index: number) => {
    setFormCatatan(prev => ({
      ...prev,
      ekskul: prev.ekskul.filter((_, idx) => idx !== index)
    }));
  };

  const handleUpdateEkskul = (index: number, field: string, val: string) => {
    setFormCatatan(prev => ({
      ...prev,
      ekskul: prev.ekskul.map((item, idx) => idx === index ? { ...item, [field]: val } : item)
    }));
  };

  const handleOpenPrint = async (siswaId: string) => {
    setIsLoadingPrint(true);
    try {
      const res = await apiFetch(`/api/wali/rapor/${siswaId}?semester=${semester}&tahunAjaran=${encodeURIComponent(tahunAjaran)}`);
      if (!res.ok) throw new Error('Gagal mengambil lembar rapor siswa');
      const data = await res.json();
      setPrintData(data);
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal membuka pratinjau rapor.'));
    } finally {
      setIsLoadingPrint(false);
    }
  };

  const filteredRekap = useMemo(() => {
    if (!searchQuery.trim()) return rekapList;
    const q = searchQuery.toLowerCase();
    return rekapList.filter(s => s.nama.toLowerCase().includes(q) || s.nisn.includes(q));
  }, [rekapList, searchQuery]);

  const rataRataKelas = useMemo(() => {
    return rekapList.length > 0 
      ? Math.round((rekapList.reduce((acc, curr) => acc + curr.rataRata, 0) / rekapList.length) * 10) / 10
      : 0;
  }, [rekapList]);

  // Top 3 Rank Students
  const topThree = useMemo(() => {
    return [...rekapList].sort((a, b) => a.ranking - b.ranking).slice(0, 3);
  }, [rekapList]);

  if (!isWali && userRole !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-card rounded-xl border border-separator">
        <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mb-3">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-lg font-bold text-label mb-1">Bukan Wali Kelas</h2>
        <p className="text-xs sm:text-sm text-label-secondary max-w-sm">
          Akun Anda saat ini belum ditugaskan sebagai Wali Kelas pada data kelas manapun. Hubungi Administrator/TU sekolah untuk penugasan.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label flex items-center gap-2">
            <Award className="text-primary" size={24} />
            <span>Rekapitulasi Kelas & Leger Rapor</span>
          </h1>
          <p className="text-xs sm:text-sm text-label-secondary mt-0.5">
            Kelas {kelasData?.nama || '-'} &bull; Semester {semester === 'GANJIL' ? 'Ganjil' : 'Genap'} &bull; Tahun Ajaran {tahunAjaran}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {(userRole === 'ADMIN' || kelasListAdmin.length > 1) && kelasListAdmin.length > 0 && (
            <select
              value={selectedKelasId}
              onChange={(e) => handleFilterChange(semester, tahunAjaran, e.target.value)}
              className="h-9 px-3 rounded-lg bg-card border border-separator text-label text-xs font-semibold focus:border-primary outline-none cursor-pointer"
            >
              {kelasListAdmin.map(k => (
                <option key={k.id} value={k.id}>Kelas {k.nama} (Tingkat {k.tingkat})</option>
              ))}
            </select>
          )}

          <select
            value={semester}
            onChange={(e) => handleFilterChange(e.target.value, tahunAjaran)}
            className="h-9 px-3 rounded-lg bg-card border border-separator text-label text-xs font-semibold focus:border-primary outline-none cursor-pointer"
          >
            <option value="GANJIL">Semester Ganjil</option>
            <option value="GENAP">Semester Genap</option>
          </select>

          <select
            value={tahunAjaran}
            onChange={(e) => handleFilterChange(semester, e.target.value)}
            className="h-9 px-3 rounded-lg bg-card border border-separator text-label text-xs font-semibold focus:border-primary outline-none cursor-pointer"
          >
            {yearOptions.map((year) => <option key={year} value={year}>T.A. {year}</option>)}
          </select>

          <button
            onClick={() => fetchRekap(selectedKelasId, semester, tahunAjaran)}
            className="p-2 rounded-lg border border-separator bg-card hover:bg-card-subtle text-label-secondary transition-colors"
            title="Muat Ulang Data"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded-lg flex items-center gap-2.5 bg-primary-subtle border border-primary-border text-primary text-xs font-medium">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-lg flex items-center gap-2.5 bg-[var(--status-fail-bg)] border border-[var(--status-fail-border)] text-[var(--status-fail)] text-xs font-medium">
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
          <span className="text-[11px] text-label-secondary">Kurikulum Tingkat SMP</span>
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
                <th className="px-3 py-3 text-center w-28">Catatan Rapor</th>
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
                  const hasCatatan = !!catatan?.catatanWali;

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
                        {hasCatatan ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-primary-subtle text-primary border border-primary-border font-semibold">
                            <CheckCircle2 size={12} /> Terisi
                          </span>
                        ) : (
                          <span className="text-[11px] text-label-tertiary">Belum Diisi</span>
                        )}
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openCatatanModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-separator bg-bg hover:bg-card-subtle text-label text-xs font-medium transition-colors"
                            title="Input Presensi, Sikap, Ekskul, dan Catatan Wali"
                          >
                            <Edit3 size={13} />
                            <span>Catatan</span>
                          </button>

                          <button
                            onClick={() => handleOpenPrint(item.siswaId)}
                            disabled={isLoadingPrint}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-medium transition-colors disabled:opacity-50"
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

      {/* Modal Tabulasi Catatan Rapor */}
      {editingSiswa && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-xl rounded-2xl border border-separator shadow-xl p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-separator pb-3">
              <div>
                <h2 className="text-base font-bold text-label">
                  Catatan Rapor: {editingSiswa.nama}
                </h2>
                <p className="text-xs text-label-secondary">
                  NISN {editingSiswa.nisn} &bull; Kelas {kelasData?.nama} &bull; {semester} {tahunAjaran}
                </p>
              </div>
              <button 
                onClick={() => setEditingSiswa(null)}
                className="p-1.5 rounded-lg hover:bg-fill text-label-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab Navigasi Modal */}
            <div className="flex border-b border-separator text-xs font-semibold gap-1">
              <button
                type="button"
                onClick={() => setActiveModalTab('presensi')}
                className={`pb-2 px-3 border-b-2 transition-colors ${
                  activeModalTab === 'presensi' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-label-secondary hover:text-label'
                }`}
              >
                1. Presensi
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('sikap')}
                className={`pb-2 px-3 border-b-2 transition-colors ${
                  activeModalTab === 'sikap' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-label-secondary hover:text-label'
                }`}
              >
                2. Sikap
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('ekskul')}
                className={`pb-2 px-3 border-b-2 transition-colors ${
                  activeModalTab === 'ekskul' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-label-secondary hover:text-label'
                }`}
              >
                3. Ekskul
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('wali')}
                className={`pb-2 px-3 border-b-2 transition-colors ${
                  activeModalTab === 'wali' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-label-secondary hover:text-label'
                }`}
              >
                4. Bimbingan & Kenaikan
              </button>
            </div>

            <form onSubmit={handleSaveCatatan} className="flex flex-col gap-4">
              
              {/* TAB 1: PRESENSI */}
              {activeModalTab === 'presensi' && (
                <div className="flex flex-col gap-3 py-2">
                  <span className="text-xs text-label-secondary">
                    Rekap ketidakhadiran siswa selama 1 semester berjalan:
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-label">Sakit (Hari)</label>
                      <input 
                        type="number"
                        min={0}
                        value={formCatatan.sakit}
                        onChange={(e) => setFormCatatan({ ...formCatatan, sakit: Number(e.target.value) })}
                        className="h-9 px-3 rounded-lg bg-bg border border-separator text-label font-mono text-center text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-label">Izin (Hari)</label>
                      <input 
                        type="number"
                        min={0}
                        value={formCatatan.izin}
                        onChange={(e) => setFormCatatan({ ...formCatatan, izin: Number(e.target.value) })}
                        className="h-9 px-3 rounded-lg bg-bg border border-separator text-label font-mono text-center text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-label">Alfa (Hari)</label>
                      <input 
                        type="number"
                        min={0}
                        value={formCatatan.alfa}
                        onChange={(e) => setFormCatatan({ ...formCatatan, alfa: Number(e.target.value) })}
                        className="h-9 px-3 rounded-lg bg-bg border border-separator text-label font-mono text-center text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SIKAP */}
              {activeModalTab === 'sikap' && (
                <div className="flex flex-col gap-3 py-2">
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
                <div className="flex flex-col gap-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-label-secondary">
                      Daftar kegiatan pengembangan diri / ekstrakurikuler:
                    </span>
                    <button
                      type="button"
                      onClick={handleAddEkskul}
                      className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
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
                          className="p-1.5 text-[var(--status-fail)] hover:bg-[var(--status-fail-bg)] rounded-md transition-colors"
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
                <div className="flex flex-col gap-3 py-2">
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

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-separator">
                <button
                  type="button"
                  onClick={() => setEditingSiswa(null)}
                  className="h-9 px-4 rounded-lg text-xs font-semibold text-label-secondary hover:bg-fill transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingCatatan}
                  className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isSavingCatatan ? 'Menyimpan...' : 'Simpan Catatan Rapor'}
                </button>
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
