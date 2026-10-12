// frontend/src/app/dashboard/siswa/page.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
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
  Users,
  ChevronLeft,
  ChevronRight,
  School
} from 'lucide-react';

interface Siswa {
  id: string;
  nisn: string;
  nama: string;
  user: { email: string };
  kelasId: string | null;
  kelas: { id: string; nama: string; tingkat: number } | null;
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('siakad_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resSiswa, resKelas] = await Promise.all([
        fetch('http://localhost:3001/api/master/siswa', { headers }),
        fetch('http://localhost:3001/api/master/kelas', { headers })
      ]);

      if (resSiswa.ok && resKelas.ok) {
        setSiswaList(await resSiswa.json());
        setKelasList(await resKelas.json());
      }
    } catch (error) {
      console.error('Gagal mengambil data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        return matchesName || matchesNisn || matchesEmail || matchesKelas;
      }

      return true;
    });
  }, [siswaList, selectedKelasFilter, searchQuery]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedKelasFilter, searchQuery, itemsPerPage]);

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

    // Only return groups that have items or when specific filter is active
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
      const token = localStorage.getItem('siakad_token');
      const url = editingId
        ? `http://localhost:3001/api/master/siswa/${editingId}`
        : 'http://localhost:3001/api/master/siswa';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSiswa) return;
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('siakad_token');
      const res = await fetch(`http://localhost:3001/api/master/siswa/${deletingSiswa.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus data siswa');

      setDeletingSiswa(null);
      setSuccessMsg('Data siswa berhasil dihapus!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-label leading-tight flex items-center gap-2.5">
            <Users className="text-accent" size={28} />
            Data Siswa
          </h1>
          <p className="text-[15px] text-label-secondary">
            Kelola data peserta didik, penempatan kelas, dan pengkategorian kelas
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button 
            onClick={openAddModal}
            className="glass glass-accent h-11 px-5 rounded-full font-semibold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
          >
            <Plus size={20} strokeWidth={2} />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </header>

      {/* Notifikasi Toast / Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl flex items-center gap-2.5 bg-[color-mix(in_srgb,var(--green)_15%,transparent)] text-label border border-[color-mix(in_srgb,var(--green)_30%,transparent)] shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-[var(--green)] shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && !isModalOpen && !deletingSiswa && (
        <div className="p-3.5 rounded-2xl flex items-center gap-2.5 bg-[color-mix(in_srgb,var(--red)_15%,transparent)] text-label border border-[color-mix(in_srgb,var(--red)_30%,transparent)] shadow-sm animate-in fade-in duration-200">
          <AlertCircle size={18} className="text-[var(--red)] shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Filter Kategori Kelas (Pill Tabs Navigation) */}
      <section 
        className="glass glass-thick p-4 flex flex-col gap-3.5"
        style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-label font-semibold text-[14px]">
            <Filter size={16} className="text-accent" />
            <span>Kategori Kelas:</span>
          </div>

          {/* Toggle Grouping & Search */}
          <div className="flex items-center gap-2.5">
            <label className="flex items-center gap-2 text-xs font-medium text-label-secondary cursor-pointer select-none px-3 py-1.5 rounded-full bg-fill hover:bg-fill/80 transition-colors">
              <input
                type="checkbox"
                checked={groupByClass}
                onChange={(e) => setGroupByClass(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-accent cursor-pointer"
              />
              <span>Kelompokkan per Bagian Kelas</span>
            </label>

            <div className="relative w-48 sm:w-60">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary" />
              <input
                type="text"
                placeholder="Cari nama, NISN, kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8.5 pl-8.5 pr-3 rounded-full bg-fill text-label text-xs placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
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
            onClick={() => setSelectedKelasFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedKelasFilter === 'ALL'
                ? 'bg-accent text-white shadow-sm'
                : 'bg-fill text-label hover:bg-fill/80'
            }`}
          >
            <span>Semua Siswa</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
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
                onClick={() => setSelectedKelasFilter(k.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-fill text-label hover:bg-fill/80'
                }`}
              >
                <span>{k.nama}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-bg text-label-secondary'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          {/* Tab Belum Ditempatkan */}
          <button
            onClick={() => setSelectedKelasFilter('UNASSIGNED')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedKelasFilter === 'UNASSIGNED'
                ? 'bg-accent text-white shadow-sm'
                : 'bg-fill text-label hover:bg-fill/80'
            }`}
          >
            <span>Belum Ada Kelas</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
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
            <div className="p-12 text-center text-label-secondary bg-bg-secondary rounded-[28px]">
              <RefreshCw size={24} className="animate-spin text-accent mx-auto mb-2" />
              <span>Memuat data siswa...</span>
            </div>
          ) : !groupedSiswa || groupedSiswa.length === 0 ? (
            <div className="p-12 text-center text-label-secondary bg-bg-secondary rounded-[28px]">
              <GraduationCap size={44} className="text-label-tertiary mx-auto mb-2 strokeWidth={1}" />
              <p className="font-semibold text-[16px]">Tidak ada siswa yang sesuai filter</p>
            </div>
          ) : (
            groupedSiswa.map((grp) => (
              <section key={grp.id} className="bg-bg-secondary rounded-[28px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
                <div className="px-6 py-4 bg-bg/40 border-b-[0.5px] border-separator flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <School size={18} className="text-accent" />
                    <h3 className="font-semibold text-label text-[16px]">{grp.title}</h3>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-fill text-label-secondary font-medium">
                    {grp.count} Siswa
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="border-b-[0.5px] border-separator">
                        <th className="px-6 py-3.5 text-[12px] font-semibold text-label-secondary uppercase tracking-wider w-32">NISN</th>
                        <th className="px-6 py-3.5 text-[12px] font-semibold text-label-secondary uppercase tracking-wider">NAMA LENGKAP</th>
                        <th className="px-6 py-3.5 text-[12px] font-semibold text-label-secondary uppercase tracking-wider">EMAIL (AKUN)</th>
                        <th className="px-6 py-3.5 text-[12px] font-semibold text-label-secondary uppercase tracking-wider text-right w-24">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="text-[14px] text-label divide-y divide-separator/40">
                      {grp.items.map((siswa) => (
                        <tr key={siswa.id} className="hover:bg-fill/50 transition-colors">
                          <td className="px-6 py-3.5 font-medium tabular-nums">{siswa.nisn}</td>
                          <td className="px-6 py-3.5 font-semibold">{siswa.nama}</td>
                          <td className="px-6 py-3.5 text-label-secondary">{siswa.user.email}</td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditModal(siswa)}
                                className="p-1.5 rounded-full hover:bg-fill text-label-secondary hover:text-accent transition-colors"
                                title="Edit Siswa"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => setDeletingSiswa(siswa)}
                                className="p-1.5 rounded-full hover:bg-fill text-label-secondary hover:text-[var(--red)] transition-colors"
                                title="Hapus Siswa"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
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
        <section className="bg-bg-secondary rounded-[28px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b-[0.5px] border-separator bg-bg/40">
                  <th className="px-6 py-4 text-[13px] font-semibold text-label-secondary">NISN</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-label-secondary">NAMA LENGKAP</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-label-secondary">KELAS</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-label-secondary">EMAIL (AKUN)</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-label-secondary text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="text-[15px] text-label divide-y divide-separator/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-label-secondary">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={24} className="animate-spin text-accent" />
                        <span>Memuat data siswa...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSiswa.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <GraduationCap size={48} className="text-label-tertiary mb-1 strokeWidth={1}" />
                        <p className="font-semibold text-[17px]">Tidak ada data siswa ditemukan</p>
                        <p className="text-[14px] text-label-secondary">
                          {searchQuery
                            ? `Tidak ada hasil yang cocok dengan pencarian "${searchQuery}".`
                            : selectedKelasFilter !== 'ALL'
                            ? 'Belum ada siswa pada kategori kelas ini.'
                            : 'Tambahkan siswa pertama untuk memulai.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedSiswa.map((siswa) => (
                    <tr key={siswa.id} className="hover:bg-fill/50 transition-colors">
                      <td className="px-6 py-4 font-medium tabular-nums">{siswa.nisn}</td>
                      <td className="px-6 py-4 font-semibold">{siswa.nama}</td>
                      <td className="px-6 py-4">
                        {siswa.kelas ? (
                          <span className="px-2.5 py-1 bg-fill rounded-md text-xs font-semibold text-accent">
                            {siswa.kelas.nama}
                          </span>
                        ) : (
                          <span className="text-label-tertiary text-xs italic px-2 py-0.5 rounded bg-fill/50">
                            Belum ada kelas
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-label-secondary text-sm">{siswa.user.email}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(siswa)}
                            className="p-2 rounded-full hover:bg-fill text-label-secondary hover:text-accent transition-colors"
                            title="Edit Siswa"
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            onClick={() => setDeletingSiswa(siswa)}
                            className="p-2 rounded-full hover:bg-fill text-label-secondary hover:text-[var(--red)] transition-colors"
                            title="Hapus Siswa"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          {filteredSiswa.length > 0 && (
            <div className="p-4 border-t-[0.5px] border-separator bg-bg/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-label-secondary">
              <div className="flex items-center gap-2">
                <span>Menampilkan</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 rounded bg-fill text-label font-medium focus:outline-none cursor-pointer"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-bg text-label">
                      {opt}
                    </option>
                  ))}
                </select>
                <span>dari total <strong>{filteredSiswa.length}</strong> siswa</span>
              </div>

              <div className="flex items-center gap-1.5 self-center">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-fill disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="px-3 py-1 font-semibold text-label">
                  Halaman {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg hover:bg-fill disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Modal Tambah / Edit Siswa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="glass glass-thick w-full max-w-lg p-6 relative flex flex-col gap-6 max-h-[90vh] overflow-y-auto" 
            style={{ '--glass-radius': 'var(--radius-2xl)' } as React.CSSProperties}
          >
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-fill transition-colors text-label-secondary"
            >
              <X size={22} />
            </button>

            <div>
              <h2 className="text-[22px] font-semibold text-label">
                {editingId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h2>
              <p className="text-[15px] text-label-secondary">
                {editingId
                  ? 'Perbarui data siswa dan kelasnya.'
                  : 'Siswa akan otomatis terdaftar dan memiliki akun.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg flex items-start gap-2 bg-[color-mix(in_srgb,var(--red)_12%,transparent)] text-label shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--red)_35%,transparent)]">
                <AlertCircle size={18} className="text-[var(--red)] mt-0.5 shrink-0" />
                 <p className="text-sm font-medium">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[15px] font-medium text-label">Nama Lengkap</label>
                <input 
                  type="text" required
                  value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Muhammad Rizky"
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[15px] font-medium text-label">NISN</label>
                <input 
                  type="text" required
                  value={formData.nisn} onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                  placeholder="0051234567"
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[15px] font-medium text-label">Kelas</label>
                <select 
                  value={formData.kelasId} 
                  onChange={(e) => setFormData({ ...formData, kelasId: e.target.value })}
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent transition-shadow cursor-pointer"
                >
                  <option value="" className="bg-bg text-label">Pilih Kelas (Opsional)</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id} className="bg-bg text-label">
                      {k.nama} (Tingkat {k.tingkat})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[15px] font-medium text-label">Email Akun</label>
                <input 
                  type="email" required
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="siswa@sekolah.com"
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[15px] font-medium text-label">
                  Kata Sandi {editingId ? '(Kosongkan jika tidak diubah)' : '(Opsional)'}
                </label>
                <input 
                  type="password" 
                  value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingId ? 'Biarkan kosong untuk mempertahankan sandi lama' : 'Default: siswa12345'}
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="h-11 px-5 rounded-full font-semibold text-label hover:bg-fill transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" disabled={isSubmitting}
                  className="glass glass-accent h-11 px-6 rounded-full font-semibold text-white active:scale-95 transition-transform disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Siswa */}
      {deletingSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="glass glass-thick w-full max-w-md p-6 relative flex flex-col gap-4" 
            style={{ '--glass-radius': 'var(--radius-2xl)' } as React.CSSProperties}
          >
            <div className="flex items-center gap-3 text-[var(--red)]">
              <div className="p-3 rounded-full bg-[color-mix(in_srgb,var(--red)_15%,transparent)]">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-label">Hapus Siswa?</h3>
            </div>

            <p className="text-sm text-label-secondary">
              Apakah Anda yakin ingin menghapus data siswa <strong>{deletingSiswa.nama}</strong> ({deletingSiswa.nisn})? Seluruh data nilai dan akun login terkait akan terhapus.
            </p>

            {errorMsg && (
              <div className="p-3 rounded-lg text-sm bg-[color-mix(in_srgb,var(--red)_12%,transparent)] text-label">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setDeletingSiswa(null)}
                disabled={isDeleting}
                className="h-10 px-5 rounded-full font-semibold text-label hover:bg-fill transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-10 px-5 rounded-full font-semibold text-white bg-[var(--red)] hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  'Ya, Hapus'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}