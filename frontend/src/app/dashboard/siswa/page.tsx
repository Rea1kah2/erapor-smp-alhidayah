// frontend/src/app/dashboard/siswa/page.tsx
'use client';
import { apiFetch } from "@/lib/api";
import { errorMessage } from '@/lib/errors';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  X, 
  AlertCircle, 
  GraduationCap, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  School,
  UserCheck,
  ShieldCheck,
  UserPlus
} from 'lucide-react';

interface Siswa {
  id: string;
  nisn: string;
  nama: string;
  user: { email: string };
  kelasId: string | null;
  kelas: { id: string; nama: string; tingkat: number } | null;
  ortu: { id: string; nama: string } | null;
}

interface Kelas {
  id: string;
  nama: string;
  tingkat: number; 
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

export default function DataSiswa() {
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrtuModalOpen, setIsOrtuModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ortuForm, setOrtuForm] = useState({ nama: '', email: '', password: '', siswaIds: [] as string[] });
  const [isSavingOrtu, setIsSavingOrtu] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering & Search & Grouping
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('ALL'); // 'ALL' | 'UNASSIGNED' | kelasId
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [groupByClass, setGroupByClass] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Mode: null (tambah baru) atau ID siswa (edit)
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({ nama: '', nisn: '', email: '', password: '', kelasId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deletingSiswa, setDeletingSiswa] = useState<Siswa | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = {};

      const [resSiswa, resKelas, resMe] = await Promise.all([
        apiFetch('/api/master/siswa', { headers }),
        apiFetch('/api/master/kelas', { headers }),
        apiFetch('/api/auth/me')
      ]);

      if (resMe.ok) setIsAdmin((await resMe.json()).user?.role === 'ADMIN');

      if (resSiswa.ok && resKelas.ok) {
        setSiswaList(await resSiswa.json());
        setKelasList(await resKelas.json());
      }
    } catch (error) {
      console.error('Gagal mengambil data', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void fetchData(); });
  }, [fetchData]);

  const saveParentAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingOrtu(true);
    setErrorMsg('');
    try {
      const response = await apiFetch('/api/master/ortu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ortuForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal membuat akun orang tua.');
      setSuccessMsg(`Akun orang tua ${data.data.nama} berhasil dibuat dan ditautkan ke ${data.data.siswaTerhubung} siswa.`);
      setIsOrtuModalOpen(false);
      setOrtuForm({ nama: '', email: '', password: '', siswaIds: [] });
      await fetchData();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Gagal membuat akun orang tua.');
    } finally {
      setIsSavingOrtu(false);
    }
  };

  // Filtered Siswa List based on Tab/Pill and Search query
  const filteredSiswa = useMemo(() => {
    return siswaList.filter((siswa) => {
      // 1. Filter Kelas
      if (selectedKelasFilter === 'UNASSIGNED') {
        if (siswa.kelasId !== null) return false;
      } else if (selectedKelasFilter !== 'ALL') {
        if (siswa.kelasId !== selectedKelasFilter) return false;
      }

      // 2. Filter Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = siswa.nama.toLowerCase().includes(query);
        const matchesNisn = siswa.nisn.toLowerCase().includes(query);
        const matchesEmail = siswa.user.email.toLowerCase().includes(query);
        const matchesKelas = siswa.kelas?.nama.toLowerCase().includes(query);
        const matchesOrtu = siswa.ortu?.nama.toLowerCase().includes(query);
        return matchesName || matchesNisn || matchesEmail || matchesKelas || Boolean(matchesOrtu);
      }

      return true;
    });
  }, [siswaList, selectedKelasFilter, searchQuery]);

  // Paginated Data
  const totalPages = Math.ceil(filteredSiswa.length / itemsPerPage) || 1;
  const paginatedSiswa = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSiswa.slice(start, start + itemsPerPage);
  }, [filteredSiswa, currentPage, itemsPerPage]);

  // Grouped Data for Group By Class mode
  const groupedSiswa = useMemo(() => {
    if (!groupByClass) return null;

    const map = new Map<string, { title: string; count: number; items: Siswa[] }>();

    // Initial group keys based on kelasList
    kelasList.forEach((k) => {
      map.set(k.id, {
        title: `${k.nama} (Tingkat ${k.tingkat})`,
        count: 0,
        items: []
      });
    });

    // Unassigned group
    map.set('UNASSIGNED', {
      title: 'Belum Ditempatkan di Kelas',
      count: 0,
      items: []
    });

    filteredSiswa.forEach((siswa) => {
      const key = siswa.kelasId || 'UNASSIGNED';
      if (!map.has(key)) {
        map.set(key, {
          title: siswa.kelas?.nama || 'Kelas Lainnya',
          count: 0,
          items: []
        });
      }
      const grp = map.get(key)!;
      grp.items.push(siswa);
      grp.count++;
    });

    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .filter((g) => g.count > 0);
  }, [groupByClass, filteredSiswa, kelasList]);

  // Count per class for badge pill
  const classCountMap = useMemo(() => {
    const map: Record<string, number> = { ALL: siswaList.length, UNASSIGNED: 0 };
    siswaList.forEach((s) => {
      if (!s.kelasId) {
        map.UNASSIGNED = (map.UNASSIGNED || 0) + 1;
      } else {
        map[s.kelasId] = (map[s.kelasId] || 0) + 1;
      }
    });
    return map;
  }, [siswaList]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ 
      nama: '', 
      nisn: '', 
      email: '', 
      password: '', 
      kelasId: selectedKelasFilter !== 'ALL' && selectedKelasFilter !== 'UNASSIGNED' ? selectedKelasFilter : '' 
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (siswa: Siswa) => {
    setEditingId(siswa.id);
    setFormData({
      nama: siswa.nama,
      nisn: siswa.nisn,
      email: siswa.user.email,
      password: '',
      kelasId: siswa.kelasId || '',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const url = editingId
        ? `/api/master/siswa/${editingId}`
        : '/api/master/siswa';
      const method = editingId ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal memproses data siswa');

      setIsModalOpen(false);
      setFormData({ nama: '', nisn: '', email: '', password: '', kelasId: '' });
      setSuccessMsg(editingId ? 'Data siswa berhasil diperbarui!' : 'Siswa baru berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData(); 
    } catch (error: unknown) {
      setErrorMsg(errorMessage(error, 'Gagal menyimpan data siswa.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSiswa) return;
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const res = await apiFetch(`/api/master/siswa/${deletingSiswa.id}`, {
        method: 'DELETE',
        headers: {}
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus data siswa');

      setDeletingSiswa(null);
      setSuccessMsg('Data siswa berhasil dihapus!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (error: unknown) {
      setErrorMsg(errorMessage(error, 'Gagal menghapus data siswa.'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-separator/40">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2 border border-emerald-200/60 dark:border-emerald-800/40">
            <GraduationCap size={14} />
            <span>Master Data Peserta Didik</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-label leading-tight">
            Data Siswa
          </h1>
          <p className="text-sm text-label-secondary mt-1">
            Kelola data peserta didik, penempatan kelas, dan penautan akun wali murid
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {isAdmin && (
            <button 
              onClick={() => setIsOrtuModalOpen(true)} 
              className="h-10 px-4 rounded-xl border border-amber-600/60 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
            >
              <UserPlus size={16} />
              <span>Tautkan Akun Orang Tua</span>
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={openAddModal}
              className="h-10 px-5 rounded-xl font-semibold text-xs text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Tambah Siswa</span>
            </button>
          )}
        </div>
      </header>

      {/* Notifikasi Toast / Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-xl flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
          <p className="text-xs sm:text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && !isModalOpen && !isOrtuModalOpen && !deletingSiswa && (
        <div className="p-3.5 rounded-xl flex items-center gap-2.5 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800/60 shadow-xs animate-in fade-in duration-200">
          <AlertCircle size={18} className="text-red-700 dark:text-red-400 shrink-0" />
          <p className="text-xs sm:text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Filter Kategori Kelas (Pill Tabs Navigation) & Search */}
      <section className="bg-bg-secondary rounded-2xl p-4 border border-separator/40 shadow-xs flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-label font-serif font-bold text-sm">
            <Filter size={16} className="text-emerald-800 dark:text-emerald-400" />
            <span>Filter Kelas</span>
          </div>

          {/* Toggle Grouping & Search */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <label className="flex items-center gap-2 text-xs font-medium text-label-secondary cursor-pointer select-none px-3 py-1.5 rounded-lg bg-fill hover:bg-fill/80 transition-colors border border-separator/30">
              <input
                type="checkbox"
                checked={groupByClass}
                onChange={(e) => setGroupByClass(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-emerald-800 cursor-pointer"
              />
              <span>Kelompokkan per Kelas</span>
            </label>

            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary" />
              <input
                type="text"
                placeholder="Cari nama, NISN, wali murid..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full h-9 pl-9 pr-8 rounded-lg bg-fill text-label text-xs placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-700/50 border border-separator/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-label-tertiary hover:text-label"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Kelas Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {/* Tab Semua Siswa */}
          <button
            onClick={() => { setSelectedKelasFilter('ALL'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
              selectedKelasFilter === 'ALL'
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-fill text-label hover:bg-fill/80 border-separator/40'
            }`}
          >
            <span>Semua Siswa</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums font-bold ${
              selectedKelasFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-bg text-label-secondary'
            }`}>
              {classCountMap.ALL || 0}
            </span>
          </button>

          {/* Tab per Kelas */}
          {kelasList.map((k) => {
            const count = classCountMap[k.id] || 0;
            const isSelected = selectedKelasFilter === k.id;
            return (
              <button
                key={k.id}
                onClick={() => { setSelectedKelasFilter(k.id); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-fill text-label hover:bg-fill/80 border-separator/40'
                }`}
              >
                <span>{k.nama}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-bg text-label-secondary'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          {/* Tab Belum Ditempatkan */}
          <button
            onClick={() => { setSelectedKelasFilter('UNASSIGNED'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
              selectedKelasFilter === 'UNASSIGNED'
                ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                : 'bg-fill text-label hover:bg-fill/80 border-separator/40'
            }`}
          >
            <span>Belum Ditempatkan</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums font-bold ${
              selectedKelasFilter === 'UNASSIGNED' ? 'bg-white/20 text-white' : 'bg-bg text-label-secondary'
            }`}>
              {classCountMap.UNASSIGNED || 0}
            </span>
          </button>
        </div>
      </section>

      {/* Mode 1: Group By Class (Kategori Terpisah per Blok Kelas) */}
      {groupByClass ? (
        <div className="flex flex-col gap-6">
          {isLoading ? (
            <div className="p-12 text-center text-label-secondary bg-bg-secondary rounded-2xl border border-separator/40">
              <RefreshCw size={24} className="animate-spin text-emerald-800 dark:text-emerald-400 mx-auto mb-2" />
              <span className="text-xs">Memuat data siswa...</span>
            </div>
          ) : !groupedSiswa || groupedSiswa.length === 0 ? (
            <div className="p-12 text-center text-label-secondary bg-bg-secondary rounded-2xl border border-separator/40">
              <GraduationCap size={44} className="text-label-tertiary mx-auto mb-2 strokeWidth={1}" />
              <p className="font-semibold text-sm">Tidak ada siswa yang sesuai filter</p>
            </div>
          ) : (
            groupedSiswa.map((grp) => (
              <section key={grp.id} className="bg-bg-secondary rounded-2xl border border-separator/40 shadow-xs overflow-hidden flex flex-col">
                <div className="px-5 py-3.5 bg-fill/40 border-b border-separator/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <School size={17} className="text-emerald-800 dark:text-emerald-400" />
                    <h3 className="font-serif font-bold text-label text-sm sm:text-base">{grp.title}</h3>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40 font-semibold tabular-nums">
                    {grp.count} Siswa
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-separator/40 bg-fill/20">
                        <th className="px-5 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider w-32">NISN</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">NAMA LENGKAP</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">EMAIL (AKUN)</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">WALI MURID</th>
                        {isAdmin && (
                          <th className="px-5 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider text-right w-24">AKSI</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="text-xs text-label divide-y divide-separator/30">
                      {grp.items.map((siswa) => (
                        <tr key={siswa.id} className="hover:bg-fill/50 transition-colors">
                          <td className="px-5 py-3 font-mono font-medium text-label-secondary tabular-nums">{siswa.nisn}</td>
                          <td className="px-5 py-3 font-semibold text-label">{siswa.nama}</td>
                          <td className="px-5 py-3 text-label-secondary">{siswa.user.email}</td>
                          <td className="px-5 py-3">
                            {siswa.ortu ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-400 font-medium">
                                <UserCheck size={13} />
                                {siswa.ortu.nama}
                              </span>
                            ) : (
                              <span className="text-xs text-label-tertiary italic">Belum ditautkan</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditModal(siswa)}
                                  className="p-1.5 rounded-lg hover:bg-fill text-label-secondary hover:text-emerald-800 dark:hover:text-emerald-400 transition-colors"
                                  title="Edit Siswa"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() => setDeletingSiswa(siswa)}
                                  className="p-1.5 rounded-lg hover:bg-fill text-label-secondary hover:text-red-600 transition-colors"
                                  title="Hapus Siswa"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
        </div>
      ) : (
        /* Mode 2: Standard Unified Table with Pagination */
        <section className="bg-bg-secondary rounded-2xl border border-separator/40 shadow-xs overflow-hidden flex flex-col">
          <div className="sm:hidden px-4 py-1.5 text-[10px] text-label-tertiary italic text-right border-b border-separator/30">
            Geser tabel ke samping untuk melihat data lengkap &rarr;
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-separator/40 bg-fill/40">
                  <th className="px-5 py-3.5 text-[11px] font-bold text-label-secondary uppercase tracking-wider w-32">NISN</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-label-secondary uppercase tracking-wider">NAMA LENGKAP</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-label-secondary uppercase tracking-wider">KELAS</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-label-secondary uppercase tracking-wider">WALI MURID</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-label-secondary uppercase tracking-wider">EMAIL (AKUN)</th>
                  {isAdmin && (
                    <th className="px-5 py-3.5 text-[11px] font-bold text-label-secondary uppercase tracking-wider text-right w-24">AKSI</th>
                  )}
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm text-label divide-y divide-separator/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-label-secondary">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={24} className="animate-spin text-emerald-800 dark:text-emerald-400" />
                        <span className="text-xs">Memuat data peserta didik...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSiswa.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <GraduationCap size={44} className="text-label-tertiary mb-1 strokeWidth={1}" />
                        <p className="font-semibold text-base">Tidak ada data siswa ditemukan</p>
                        <p className="text-xs text-label-secondary">
                          {searchQuery
                            ? `Tidak ada hasil yang cocok dengan pencarian "${searchQuery}".`
                            : selectedKelasFilter !== 'ALL'
                            ? 'Belum ada siswa pada kategori kelas ini.'
                            : 'Tambahkan siswa pertama untuk memulai pengisian rapor.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedSiswa.map((siswa) => (
                    <tr key={siswa.id} className="hover:bg-fill/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-label-secondary tabular-nums">{siswa.nisn}</td>
                      <td className="px-5 py-3.5 font-semibold text-label">{siswa.nama}</td>
                      <td className="px-5 py-3.5">
                        {siswa.kelas ? (
                          <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 rounded-md text-xs font-semibold">
                            {siswa.kelas.nama}
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 text-xs italic px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200/40">
                            Belum ada kelas
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {siswa.ortu ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                            <UserCheck size={13} className="text-emerald-700" />
                            {siswa.ortu.nama}
                          </span>
                        ) : (
                          <span className="text-xs text-label-tertiary italic">Belum terhubung</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-label-secondary text-xs">{siswa.user.email}</td>
                      {isAdmin && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(siswa)}
                              className="p-1.5 rounded-lg hover:bg-fill text-label-secondary hover:text-emerald-800 dark:hover:text-emerald-400 transition-colors"
                              title="Edit Siswa"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeletingSiswa(siswa)}
                              className="p-1.5 rounded-lg hover:bg-fill text-label-secondary hover:text-red-600 transition-colors"
                              title="Hapus Siswa"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          {filteredSiswa.length > 0 && (
            <div className="p-4 border-t border-separator/40 bg-fill/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-label-secondary">
              <div className="flex items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1 rounded bg-bg text-label font-medium border border-separator/40 focus:outline-none cursor-pointer"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-bg text-label">
                      {opt} baris
                    </option>
                  ))}
                </select>
                <span>dari total <strong>{filteredSiswa.length}</strong> siswa</span>
              </div>

              <div className="flex items-center gap-1.5 self-center">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-fill disabled:opacity-30 disabled:hover:bg-transparent transition-colors border border-separator/30"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={15} />
                </button>

                <span className="px-3 py-1 font-semibold text-label">
                  Halaman {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg hover:bg-fill disabled:opacity-30 disabled:hover:bg-transparent transition-colors border border-separator/30"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Modal Tambah / Edit Siswa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-bg-secondary border border-separator/40 rounded-2xl shadow-xl p-6 relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-fill transition-colors text-label-secondary"
            >
              <X size={20} />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400 mb-1">
                <GraduationCap size={15} />
                <span>Formulir Peserta Didik</span>
              </div>
              <h2 className="text-xl font-serif font-bold text-label">
                {editingId ? 'Perbarui Data Siswa' : 'Pendaftaran Siswa Baru'}
              </h2>
              <p className="text-xs text-label-secondary mt-0.5">
                {editingId
                  ? 'Perbarui data identitas siswa dan kelasnya.'
                  : 'Siswa otomatis dibuatkan kredensial login dengan peran SISWA.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl flex items-start gap-2 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800/60 text-xs font-medium">
                <AlertCircle size={16} className="text-red-700 dark:text-red-400 mt-0.5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Nama Lengkap Siswa</label>
                <input 
                  type="text" required
                  value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Muhammad Rizky"
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator/40 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-label">NISN (10 Digit)</label>
                  <input 
                    type="text" required
                    value={formData.nisn} onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="0051234567"
                    className="h-10 px-3 rounded-xl bg-fill text-label text-sm font-mono border border-separator/40 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-label">Kelas</label>
                  <select 
                    value={formData.kelasId} 
                    onChange={(e) => setFormData({ ...formData, kelasId: e.target.value })}
                    className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator/40 focus:outline-none focus:ring-2 focus:ring-emerald-700/50 cursor-pointer"
                  >
                    <option value="" className="bg-bg text-label">-- Tanpa Kelas --</option>
                    {kelasList.map((k) => (
                      <option key={k.id} value={k.id} className="bg-bg text-label">
                        {k.nama} (Tingkat {k.tingkat})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Email Akun Login</label>
                <input 
                  type="email" required
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="siswa@smp-alhidayah.sch.id"
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator/40 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">
                  Kata Sandi {editingId ? '(Kosongkan jika tidak diubah)' : '(Minimal 12 karakter)'}
                </label>
                <input 
                  type="password" 
                  minLength={12}
                  required={!editingId}
                  value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingId ? 'Biarkan kosong untuk mempertahankan kata sandi lama' : 'Buat kata sandi minimal 12 karakter'}
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator/40 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                />
              </div>
              
              <div className="flex justify-end gap-2.5 pt-3 border-t border-separator/40 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold text-label hover:bg-fill transition-colors border border-separator/40"
                >
                  Batal
                </button>
                <button 
                  type="submit" disabled={isSubmitting}
                  className="h-10 px-5 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Daftarkan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Akun Orang Tua */}
      {isOrtuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <form 
            onSubmit={saveParentAccount} 
            className="w-full max-w-lg bg-bg-secondary border border-separator/40 rounded-2xl shadow-xl p-6 relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
          >
            <button 
              type="button"
              onClick={() => setIsOrtuModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-fill transition-colors text-label-secondary"
            >
              <X size={20} />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                <ShieldCheck size={15} />
                <span>Akses Orang Tua / Wali Murid</span>
              </div>
              <h2 className="text-xl font-serif font-bold text-label">
                Buat & Tautkan Akun Orang Tua
              </h2>
              <p className="text-xs text-label-secondary mt-0.5">
                Akun ini memberikan hak akses bagi orang tua untuk memantau nilai rapor anak secara transparan.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl flex items-start gap-2 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800/60 text-xs font-medium">
                <AlertCircle size={16} className="text-red-700 dark:text-red-400 mt-0.5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-label">Nama Orang Tua / Wali</label>
              <input 
                required 
                value={ortuForm.nama} 
                onChange={(e) => setOrtuForm({ ...ortuForm, nama: e.target.value })} 
                placeholder="Contoh: Bapak H. Hendra Syahputra"
                className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator/40 focus:outline-none focus:ring-2 focus:ring-amber-600/50" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-label">Email Login</label>
              <input 
                required 
                type="email" 
                value={ortuForm.email} 
                onChange={(e) => setOrtuForm({ ...ortuForm, email: e.target.value })} 
                placeholder="ortu@gmail.com"
                className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator/40 focus:outline-none focus:ring-2 focus:ring-amber-600/50" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-label">Kata Sandi Awal (Min. 12 Karakter)</label>
              <input 
                required 
                type="password" 
                minLength={12} 
                value={ortuForm.password} 
                onChange={(e) => setOrtuForm({ ...ortuForm, password: e.target.value })} 
                placeholder="Masukkan kata sandi akun"
                className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator/40 focus:outline-none focus:ring-2 focus:ring-amber-600/50" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-label">Pilih Anak yang Ditautkan</label>
              <select 
                required 
                multiple 
                value={ortuForm.siswaIds} 
                onChange={(e) => setOrtuForm({ ...ortuForm, siswaIds: Array.from(e.target.selectedOptions, (option) => option.value) })} 
                className="min-h-32 w-full p-2.5 rounded-xl bg-fill text-label text-xs border border-separator/40 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
              >
                {siswaList.filter((siswa) => !siswa.ortu).map((siswa) => (
                  <option key={siswa.id} value={siswa.id} className="py-1 px-1.5 rounded hover:bg-emerald-800 hover:text-white">
                    {siswa.nama} — NISN: {siswa.nisn} {siswa.kelas ? `(${siswa.kelas.nama})` : ''}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-label-secondary">
                Tahan tombol <kbd className="px-1 py-0.5 rounded bg-fill border border-separator/40">Ctrl</kbd> (Windows) atau <kbd className="px-1 py-0.5 rounded bg-fill border border-separator/40">Command</kbd> (Mac) untuk memilih lebih dari satu anak.
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-separator/40 mt-2">
              <button 
                type="button" 
                onClick={() => setIsOrtuModalOpen(false)} 
                className="h-10 px-4 rounded-xl text-xs font-semibold text-label hover:bg-fill transition-colors border border-separator/40"
              >
                Batal
              </button>
              <button 
                disabled={isSavingOrtu} 
                className="h-10 px-5 rounded-xl text-xs font-semibold text-white bg-amber-700 hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50 shadow-xs"
              >
                {isSavingOrtu ? 'Menyimpan...' : 'Buat Akun Orang Tua'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Siswa */}
      {deletingSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-bg-secondary border border-separator/40 rounded-2xl shadow-xl p-6 relative flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200/50 dark:border-red-900/40">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-label">Hapus Data Siswa?</h3>
                <p className="text-xs text-label-secondary">Tindakan ini permanen dan tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-label-secondary leading-relaxed bg-fill/50 p-3 rounded-xl border border-separator/30">
              Apakah Anda yakin ingin menghapus peserta didik <strong className="text-label">{deletingSiswa.nama}</strong> (NISN: {deletingSiswa.nisn})? Seluruh rekaman nilai capaian akademik dan akun pengguna terkait akan dihapus.
            </p>

            {errorMsg && (
              <div className="p-3 rounded-xl text-xs bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2 border-t border-separator/40">
              <button
                onClick={() => setDeletingSiswa(null)}
                disabled={isDeleting}
                className="h-10 px-4 rounded-xl text-xs font-semibold text-label hover:bg-fill transition-colors border border-separator/40"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-10 px-5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  'Ya, Hapus Data'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
