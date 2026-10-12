'use client';
import { useState, useEffect } from 'react';
import { 
  Award, 
  Users, 
  FileSpreadsheet, 
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
  Calendar,
  Layers
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
    sikapSpiritual: string;
    deskripsiSpiritual: string;
    sikapSosial: string;
    deskripsiSosial: string;
    ekskul: Array<{ nama: string; predikat: string; keterangan: string }> | any;
    catatanWali: string;
    statusKenaikan?: string | null;
  } | null;
}

export default function WaliKelasPage() {
  const [kelasData, setKelasData] = useState<any>(null);
  const [kelasListAdmin, setKelasListAdmin] = useState<any[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [isWali, setIsWali] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string>('GURU');

  const [semester, setSemester] = useState<string>('GANJIL');
  const [tahunAjaran, setTahunAjaran] = useState<string>('2025/2026');

  const [rekapList, setRekapList] = useState<SiswaRekap[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Notifikasi
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Modal Catatan Rapor
  const [editingSiswa, setEditingSiswa] = useState<SiswaRekap | null>(null);
  const [formCatatan, setFormCatatan] = useState({
    sakit: 0,
    izin: 0,
    alfa: 0,
    sikapSpiritual: 'A',
    deskripsiSpiritual: 'Menunjukkan ketaatan beribadah dan sikap berdoa dengan sangat baik.',
    sikapSosial: 'A',
    deskripsiSosial: 'Menunjukkan sikap santun, disiplin, peduli, dan bertanggung jawab.',
    ekskul: [
      { nama: 'Pramuka (Wajib)', predikat: 'A', keterangan: 'Sangat aktif dalam kegiatan latihan mingguan' }
    ],
    catatanWali: '',
    statusKenaikan: ''
  });
  const [isSavingCatatan, setIsSavingCatatan] = useState<boolean>(false);

  // Modal Cetak Rapor
  const [printData, setPrintData] = useState<RaporData | null>(null);
  const [isLoadingPrint, setIsLoadingPrint] = useState<boolean>(false);

  // 1. Cek info penugasan wali kelas
  const fetchKelasBinaan = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('siakad_token');
      const role = localStorage.getItem('siakad_role') || 'GURU';
      setUserRole(role);

      const res = await fetch('http://localhost:3001/api/wali/kelas-binaan', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Gagal mengambil data penugasan wali kelas');
      const data = await res.json();

      setIsWali(data.isWali);
      if (data.role === 'ADMIN') {
        setKelasListAdmin(data.kelasList || []);
        if (data.kelasList && data.kelasList.length > 0) {
          const defaultId = data.kelasList[0].id;
          setSelectedKelasId(defaultId);
          fetchRekap(defaultId, semester, tahunAjaran);
        }
      } else if (data.kelas) {
        setKelasData(data.kelas);
        setSelectedKelasId(data.kelas.id);
        fetchRekap(data.kelas.id, semester, tahunAjaran);
      } else {
        setIsWali(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Ambil rekapitulasi nilai dan catatan rapor kelas
  const fetchRekap = async (kelasId: string, sem: string, thn: string) => {
    if (!kelasId) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('siakad_token');
      const url = `http://localhost:3001/api/wali/rekap?kelasId=${kelasId}&semester=${sem}&tahunAjaran=${encodeURIComponent(thn)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengambil rekapitulasi kelas');
      }

      const data = await res.json();
      setRekapList(data.rekap || []);
      setMapelList(data.mapelList || []);
      setKelasData(data.kelas);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKelasBinaan();
  }, []);

  const handleFilterChange = (newSem: string, newThn: string, newKelasId?: string) => {
    const kId = newKelasId !== undefined ? newKelasId : selectedKelasId;
    setSemester(newSem);
    setTahunAjaran(newThn);
    if (newKelasId !== undefined) setSelectedKelasId(newKelasId);
    fetchRekap(kId, newSem, newThn);
  };

  // Buka modal edit catatan rapor
  const openCatatanModal = (item: SiswaRekap) => {
    setEditingSiswa(item);
    const existing = item.catatanRapor;
    if (existing) {
      setFormCatatan({
        sakit: existing.sakit || 0,
        izin: existing.izin || 0,
        alfa: existing.alfa || 0,
        sikapSpiritual: existing.sikapSpiritual || 'A',
        deskripsiSpiritual: existing.deskripsiSpiritual || 'Menunjukkan ketaatan beribadah dan sikap berdoa dengan sangat baik.',
        sikapSosial: existing.sikapSosial || 'A',
        deskripsiSosial: existing.deskripsiSosial || 'Menunjukkan sikap santun, disiplin, peduli, dan bertanggung jawab.',
        ekskul: Array.isArray(existing.ekskul) && existing.ekskul.length > 0 ? existing.ekskul : [
          { nama: 'Pramuka (Wajib)', predikat: 'A', keterangan: 'Aktif mengikuti kegiatan kepramukaan' }
        ],
        catatanWali: existing.catatanWali || '',
        statusKenaikan: existing.statusKenaikan || (semester === 'GENAP' ? 'Naik ke Kelas Berikutnya' : '')
      });
    } else {
      setFormCatatan({
        sakit: 0,
        izin: 0,
        alfa: 0,
        sikapSpiritual: 'A',
        deskripsiSpiritual: 'Menunjukkan ketaatan beribadah dan sikap berdoa dengan sangat baik.',
        sikapSosial: 'A',
        deskripsiSosial: 'Menunjukkan sikap santun, disiplin, peduli, dan bertanggung jawab.',
        ekskul: [
          { nama: 'Pramuka (Wajib)', predikat: 'A', keterangan: 'Aktif mengikuti kegiatan kepramukaan' }
        ],
        catatanWali: 'Pertahankan prestasi belajar dan tingkatkan terus keaktifan dalam kegiatan belajar.',
        statusKenaikan: semester === 'GENAP' ? 'Naik ke Kelas Berikutnya' : ''
      });
    }
  };

  // Simpan Catatan Rapor
  const handleSaveCatatan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSiswa) return;
    setIsSavingCatatan(true);
    try {
      const token = localStorage.getItem('siakad_token');
      const res = await fetch('http://localhost:3001/api/wali/catatan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingCatatan(false);
    }
  };

  // Handler Ekskul Dinamis
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

  // Buka Pratinjau & Cetak Rapor
  const handleOpenPrint = async (siswaId: string) => {
    setIsLoadingPrint(true);
    try {
      const token = localStorage.getItem('siakad_token');
      const res = await fetch(`http://localhost:3001/api/wali/rapor/${siswaId}?semester=${semester}&tahunAjaran=${encodeURIComponent(tahunAjaran)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Gagal mengambil lembar rapor siswa');
      const data = await res.json();
      setPrintData(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoadingPrint(false);
    }
  };

  // Filter Search
  const filteredRekap = rekapList.filter(s => 
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nisn.includes(searchQuery)
  );

  // Hitung rata-rata kelas
  const rataRataKelas = rekapList.length > 0 
    ? Math.round((rekapList.reduce((acc, curr) => acc + curr.rataRata, 0) / rekapList.length) * 10) / 10
    : 0;

  if (!isWali && userRole !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-label mb-2">Bukan Wali Kelas</h2>
        <p className="text-sm text-label-secondary max-w-md">
          Akun Anda saat ini belum ditugaskan sebagai Wali Kelas pada data kelas manapun di SMP Al-Hidayah. Hubungi Administrator/TU jika penugasan ini belum diatur.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent"></span>
            <span className="text-xs uppercase tracking-wider font-semibold text-accent">Peran Wali Kelas</span>
          </div>
          <h1 className="text-2xl font-bold text-label mt-1">
            Rekapitulasi & E-Rapor Kelas {kelasData?.nama || ''}
          </h1>
          <p className="text-sm text-label-secondary">
            Pengelolaan nilai akhir, kehadiran, evaluasi sikap, dan cetak rapor peserta didik SMP Al-Hidayah.
          </p>
        </div>

        {/* CONTROLS (Semester, Tahun, Kelas) */}
        <div className="flex flex-wrap items-center gap-2">
          {userRole === 'ADMIN' && kelasListAdmin.length > 0 && (
            <select
              value={selectedKelasId}
              onChange={(e) => handleFilterChange(semester, tahunAjaran, e.target.value)}
              className="h-10 px-3 rounded-full bg-bg-secondary text-label text-xs font-semibold border border-separator focus:ring-2 focus:ring-accent outline-none"
            >
              {kelasListAdmin.map(k => (
                <option key={k.id} value={k.id}>Kelas {k.nama} (Tingkat {k.tingkat})</option>
              ))}
            </select>
          )}

          <select
            value={semester}
            onChange={(e) => handleFilterChange(e.target.value, tahunAjaran)}
            className="h-10 px-3 rounded-full bg-bg-secondary text-label text-xs font-semibold border border-separator focus:ring-2 focus:ring-accent outline-none"
          >
            <option value="GANJIL">Semester Ganjil</option>
            <option value="GENAP">Semester Genap</option>
          </select>

          <select
            value={tahunAjaran}
            onChange={(e) => handleFilterChange(semester, e.target.value)}
            className="h-10 px-3 rounded-full bg-bg-secondary text-label text-xs font-semibold border border-separator focus:ring-2 focus:ring-accent outline-none"
          >
            <option value="2025/2026">T.A. 2025/2026</option>
            <option value="2026/2027">T.A. 2026/2027</option>
          </select>

          <button
            onClick={() => fetchRekap(selectedKelasId, semester, tahunAjaran)}
            className="p-2.5 rounded-full bg-bg-secondary hover:bg-fill text-label-secondary transition-colors"
            title="Muat Ulang Data"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* NOTIFIKASI SUCCESS / ERROR */}
      {successMsg && (
        <div className="p-3.5 rounded-[16px] bg-[var(--green)]/15 border border-[var(--green)]/30 text-[var(--green)] flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-[16px] bg-[var(--red)]/15 border border-[var(--red)]/30 text-[var(--red)] flex items-center gap-2">
          <AlertCircle size={18} />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* KPI STATISTIK KELAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-5 flex flex-col gap-2" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs uppercase font-semibold">Total Siswa</span>
            <Users size={18} className="text-accent" />
          </div>
          <span className="text-3xl font-bold tabular-nums text-label">{rekapList.length}</span>
          <span className="text-xs text-label-secondary">Peserta Didik Terdaftar</span>
        </div>

        <div className="glass p-5 flex flex-col gap-2" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs uppercase font-semibold">Rata-Rata Kelas</span>
            <TrendingUp size={18} className="text-[var(--green)]" />
          </div>
          <span className="text-3xl font-bold tabular-nums text-label">{rataRataKelas}</span>
          <span className="text-xs text-label-secondary">Akumulasi Nilai Akhir (NA)</span>
        </div>

        <div className="glass p-5 flex flex-col gap-2" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs uppercase font-semibold">Wali Kelas</span>
            <School size={18} className="text-[#ff9500]" />
          </div>
          <span className="text-xl font-bold text-label truncate">
            {kelasData?.wali?.nama || 'Belum Ditetapkan'}
          </span>
          <span className="text-xs text-label-secondary">
            {kelasData?.wali?.nip ? `NIP: ${kelasData.wali.nip}` : 'NIP: -'}
          </span>
        </div>

        <div className="glass p-5 flex flex-col gap-2" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs uppercase font-semibold">Mata Pelajaran</span>
            <Layers size={18} className="text-[#af52de]" />
          </div>
          <span className="text-3xl font-bold tabular-nums text-label">{mapelList.length}</span>
          <span className="text-xs text-label-secondary">Kurikulum SMP Al-Hidayah</span>
        </div>
      </div>

      {/* FILTER SEARCH & DAFTAR SISWA */}
      <div className="glass p-5 rounded-[28px] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-label-secondary" />
            <input 
              type="text"
              placeholder="Cari nama siswa atau NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-fill text-label text-sm placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="text-xs text-label-secondary">
            Menampilkan <strong>{filteredRekap.length}</strong> siswa
          </div>
        </div>

        {/* TABEL REKAP KELAS */}
        <div className="overflow-x-auto rounded-[20px] border border-separator/40">
          <table className="w-full text-left text-sm">
            <thead className="bg-fill/40 text-label-secondary text-xs uppercase font-semibold border-b border-separator/40">
              <tr>
                <th className="py-3 px-4 text-center w-12">Peringkat</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">NISN</th>
                <th className="py-3 px-4 text-center">Rata-Rata (NA)</th>
                <th className="py-3 px-4 text-center">Kehadiran (S/I/A)</th>
                <th className="py-3 px-4 text-center">Catatan Rapor</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-separator/30 text-label">
              {filteredRekap.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-label-secondary">
                    Tidak ada siswa ditemukan di kelas ini.
                  </td>
                </tr>
              ) : (
                filteredRekap.map((item) => {
                  const catatan = item.catatanRapor;
                  const presensiText = catatan 
                    ? `${catatan.sakit} / ${catatan.izin} / ${catatan.alfa}` 
                    : '0 / 0 / 0';
                  const hasCatatan = !!catatan?.catatanWali;

                  return (
                    <tr key={item.siswaId} className="hover:bg-fill/30 transition-colors">
                      <td className="py-3 px-4 text-center font-bold font-mono">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${
                          item.ranking === 1 ? 'bg-amber-400/20 text-amber-500 font-extrabold' :
                          item.ranking === 2 ? 'bg-slate-300/30 text-slate-400 font-extrabold' :
                          item.ranking === 3 ? 'bg-amber-700/20 text-amber-700 font-extrabold' :
                          'text-label-secondary'
                        }`}>
                          {item.ranking}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {item.nama}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-label-secondary">
                        {item.nisn}
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-base">
                        <span className={item.rataRata >= 75 ? 'text-[var(--green)]' : 'text-amber-500'}>
                          {item.rataRata}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-label-secondary">
                        {presensiText}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasCatatan ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--green)] font-medium">
                            <CheckCircle2 size={14} /> Terisi
                          </span>
                        ) : (
                          <span className="text-xs text-label-tertiary">Belum Diisi</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openCatatanModal(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fill hover:bg-label/10 text-label text-xs font-semibold transition-colors"
                            title="Input Presensi, Sikap, Ekskul, dan Catatan Wali"
                          >
                            <Edit3 size={14} />
                            <span>Catatan</span>
                          </button>

                          <button
                            onClick={() => handleOpenPrint(item.siswaId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 hover:bg-accent text-accent hover:text-white text-xs font-semibold transition-colors"
                            title="Cetak Lembar Rapor Siswa"
                          >
                            <Printer size={14} />
                            <span>Cetak</span>
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
      </div>

      {/* MODAL INPUT CATATAN RAPOR (PRESENSI, SIKAP, EKSKUL, CATATAN WALI) */}
      {editingSiswa && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass glass-thick w-full max-w-2xl rounded-[28px] p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
            
            <div className="flex items-center justify-between border-b border-separator/40 pb-3">
              <div>
                <h3 className="text-lg font-bold text-label">
                  Catatan Rapor: {editingSiswa.nama}
                </h3>
                <p className="text-xs text-label-secondary">
                  NISN: {editingSiswa.nisn} &bull; Kelas {kelasData?.nama} &bull; {semester} {tahunAjaran}
                </p>
              </div>
              <button 
                onClick={() => setEditingSiswa(null)}
                className="p-2 rounded-full hover:bg-fill text-label-secondary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCatatan} className="flex flex-col gap-5">
              
              {/* SECTION 1: PRESENSI */}
              <div className="bg-bg-secondary p-4 rounded-[20px] flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-label">
                  1. Rekapitulasi Presensi (Kehadiran)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-label-secondary font-medium">Sakit (Hari)</label>
                    <input 
                      type="number"
                      min={0}
                      value={formCatatan.sakit}
                      onChange={(e) => setFormCatatan({ ...formCatatan, sakit: Number(e.target.value) })}
                      className="w-full h-10 px-3 rounded-lg bg-bg text-label font-mono text-center focus:ring-2 focus:ring-accent outline-none mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-label-secondary font-medium">Izin (Hari)</label>
                    <input 
                      type="number"
                      min={0}
                      value={formCatatan.izin}
                      onChange={(e) => setFormCatatan({ ...formCatatan, izin: Number(e.target.value) })}
                      className="w-full h-10 px-3 rounded-lg bg-bg text-label font-mono text-center focus:ring-2 focus:ring-accent outline-none mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-label-secondary font-medium">Alfa (Hari)</label>
                    <input 
                      type="number"
                      min={0}
                      value={formCatatan.alfa}
                      onChange={(e) => setFormCatatan({ ...formCatatan, alfa: Number(e.target.value) })}
                      className="w-full h-10 px-3 rounded-lg bg-bg text-label font-mono text-center focus:ring-2 focus:ring-accent outline-none mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: SIKAP SPIRITUAL & SOSIAL */}
              <div className="bg-bg-secondary p-4 rounded-[20px] flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-label">
                  2. Perkembangan Sikap & Kepribadian
                </span>
                
                {/* Sikap Spiritual */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-label">Sikap Spiritual</label>
                    <select
                      value={formCatatan.sikapSpiritual}
                      onChange={(e) => setFormCatatan({ ...formCatatan, sikapSpiritual: e.target.value })}
                      className="h-8 px-2.5 rounded-lg bg-bg text-label text-xs font-bold outline-none border border-separator/40"
                    >
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
                    placeholder="Deskripsi perkembangan sikap spiritual..."
                    className="w-full h-9 px-3 rounded-lg bg-bg text-label text-xs focus:ring-2 focus:ring-accent outline-none"
                  />
                </div>

                {/* Sikap Sosial */}
                <div className="flex flex-col gap-2 pt-2 border-t border-separator/30">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-label">Sikap Sosial</label>
                    <select
                      value={formCatatan.sikapSosial}
                      onChange={(e) => setFormCatatan({ ...formCatatan, sikapSosial: e.target.value })}
                      className="h-8 px-2.5 rounded-lg bg-bg text-label text-xs font-bold outline-none border border-separator/40"
                    >
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
                    placeholder="Deskripsi perkembangan sikap sosial..."
                    className="w-full h-9 px-3 rounded-lg bg-bg text-label text-xs focus:ring-2 focus:ring-accent outline-none"
                  />
                </div>
              </div>

              {/* SECTION 3: EKSTRAKURIKULER */}
              <div className="bg-bg-secondary p-4 rounded-[20px] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-label">
                    3. Kegiatan Ekstrakurikuler
                  </span>
                  <button
                    type="button"
                    onClick={handleAddEkskul}
                    className="text-xs font-semibold text-accent flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> Tambah Kegiatan
                  </button>
                </div>

                {formCatatan.ekskul.map((eks, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nama Ekskul (misal: Pramuka)"
                      value={eks.nama}
                      onChange={(e) => handleUpdateEkskul(idx, 'nama', e.target.value)}
                      className="flex-1 h-9 px-3 rounded-lg bg-bg text-label text-xs outline-none focus:ring-2 focus:ring-accent"
                      required
                    />
                    <select
                      value={eks.predikat}
                      onChange={(e) => handleUpdateEkskul(idx, 'predikat', e.target.value)}
                      className="w-16 h-9 px-2 rounded-lg bg-bg text-label text-xs font-bold outline-none"
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
                      className="flex-1 h-9 px-3 rounded-lg bg-bg text-label text-xs outline-none focus:ring-2 focus:ring-accent"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEkskul(idx)}
                      className="p-2 text-[var(--red)] hover:bg-fill rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* SECTION 4: CATATAN WALI KELAS & KENAIKAN */}
              <div className="bg-bg-secondary p-4 rounded-[20px] flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-label">
                  4. Catatan Wali Kelas & Keputusan
                </span>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-label-secondary font-medium">Catatan Motivasi / Bimbingan</label>
                  <textarea
                    rows={3}
                    value={formCatatan.catatanWali}
                    onChange={(e) => setFormCatatan({ ...formCatatan, catatanWali: e.target.value })}
                    placeholder="Tuliskan catatan bimbingan atau motivasi untuk siswa..."
                    className="w-full p-3 rounded-lg bg-bg text-label text-xs outline-none focus:ring-2 focus:ring-accent resize-none"
                    required
                  />
                </div>

                {semester === 'GENAP' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-label-secondary font-medium">Keputusan Kenaikan Kelas / Kelulusan</label>
                    <input
                      type="text"
                      value={formCatatan.statusKenaikan}
                      onChange={(e) => setFormCatatan({ ...formCatatan, statusKenaikan: e.target.value })}
                      placeholder="Contoh: Naik ke Kelas VIII / Lulus dari Satuan Pendidikan"
                      className="w-full h-9 px-3 rounded-lg bg-bg text-label text-xs outline-none focus:ring-2 focus:ring-accent font-semibold"
                    />
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSiswa(null)}
                  className="px-5 py-2.5 rounded-full hover:bg-fill text-label-secondary font-medium text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingCatatan}
                  className="px-6 py-2.5 rounded-full glass glass-accent text-white font-semibold text-sm shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSavingCatatan ? 'Menyimpan...' : 'Simpan Catatan Rapor'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL PRINT PREVIEW */}
      {printData && (
        <PrintableRapor 
          data={printData} 
          onClose={() => setPrintData(null)} 
        />
      )}

    </div>
  );
}
