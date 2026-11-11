// frontend/src/app/dashboard/akademik/page.tsx
'use client';
import { apiFetch } from "@/lib/api";
import { errorMessage } from '@/lib/errors';
import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  X, 
  AlertCircle, 
  Inbox, 
  School, 
  BookOpen, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  RefreshCw,
  Calendar,
  UserCheck,
  GraduationCap,
  Layers
} from 'lucide-react';

interface Guru { id: string; nama: string; }
interface Kelas { id: string; nama: string; tingkat: number; waliId?: string | null; wali: { nama: string } | null; }
interface Mapel { id: string; nama: string; kkm: number; guruId?: string | null; guru: { nama: string } | null; }
interface AcademicYear { id: string; nama: string; aktif: boolean; }
interface TeachingAssignment { id: string; guru: Guru; mapel: Mapel; kelas: Kelas; }
interface Student { id: string; nama: string; nisn: string; kelasId: string | null; }

type TabKey = 'struktur' | 'penugasan';

export default function DataAkademik() {
  const [activeTab, setActiveTab] = useState<TabKey>('struktur');
  const [isAdmin, setIsAdmin] = useState(false);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [yearList, setYearList] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [newYear, setNewYear] = useState('');
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [enrollmentForm, setEnrollmentForm] = useState({ siswaId: '', kelasId: '' });
  const [assignmentForm, setAssignmentForm] = useState({ kelasId: '', mapelId: '', guruId: '' });
  const [homeroomForm, setHomeroomForm] = useState({ kelasId: '', guruId: '' });
  const [isLoading, setIsLoading] = useState(true);

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Modal Kelas
  const [isModalKelasOpen, setIsModalKelasOpen] = useState(false);
  const [editingKelasId, setEditingKelasId] = useState<string | null>(null);
  const [formKelas, setFormKelas] = useState({ nama: '', tingkat: '', waliId: '' });
  
  // State Modal Mapel
  const [isModalMapelOpen, setIsModalMapelOpen] = useState(false);
  const [editingMapelId, setEditingMapelId] = useState<string | null>(null);
  const [formMapel, setFormMapel] = useState({ nama: '', kkm: '', guruId: '' });

  // Delete State
  const [deletingItem, setDeletingItem] = useState<{ type: 'kelas' | 'mapel'; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const headers = {};

      const [resKelas, resMapel, resGuru, resYear] = await Promise.all([
        apiFetch(`/api/master/kelas${selectedYear ? `?tahunAjaran=${encodeURIComponent(selectedYear)}` : ''}`, { headers }),
        apiFetch('/api/master/mapel', { headers }),
        apiFetch('/api/master/guru', { headers }),
        apiFetch('/api/master/tahun-ajaran', { headers })
      ]);

      if (resKelas.ok) setKelasList(await resKelas.json());
      if (resMapel.ok) setMapelList(await resMapel.json());
      if (resGuru.ok) setGuruList(await resGuru.json());
      if (resYear.ok) {
        const years: AcademicYear[] = await resYear.json();
        setYearList(years);
        if (!selectedYear) setSelectedYear(years.find((year) => year.aktif)?.nama || years[0]?.nama || '');
      }
    } catch {
      console.error('Gagal mengambil data akademik');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    queueMicrotask(() => { 
      void fetchData(); 
      apiFetch('/api/auth/me')
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setIsAdmin(data.user?.role === 'ADMIN');
          }
        })
        .catch(() => {});
    });
  }, [fetchData]);

  useEffect(() => {
    if (!selectedYear) return;
    const loadYearData = async () => {
      const headers = {};
      const [classRes, assignmentRes, studentRes] = await Promise.all([
        apiFetch(`/api/master/kelas?tahunAjaran=${encodeURIComponent(selectedYear)}`, { headers }),
        apiFetch(`/api/master/penugasan?tahunAjaran=${encodeURIComponent(selectedYear)}`, { headers }),
        apiFetch(`/api/master/siswa?tahunAjaran=${encodeURIComponent(selectedYear)}`, { headers })
      ]);
      if (classRes.ok) setKelasList(await classRes.json());
      if (studentRes.ok) setStudentList(await studentRes.json());
      if (assignmentRes.ok) {
        const data = await assignmentRes.json();
        setTeachingAssignments(data.kelasMapel || []);
      }
    };
    loadYearData().catch(() => setErrorMsg('Gagal memuat penugasan tahun ajaran.'));
  }, [selectedYear]);

  const createAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await apiFetch('/api/master/tahun-ajaran', {
        method: 'POST', headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ nama: newYear })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal membuat tahun ajaran.');
      setNewYear('');
      setSelectedYear(data.data.nama);
      await fetchData();
      setSuccessMsg('Tahun ajaran berhasil dibuat. Aktifkan tahun tersebut sebelum mengisi data kelasnya.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Gagal membuat tahun ajaran.'); }
  };

  const activateAcademicYear = async () => {
    const year = yearList.find((item) => item.nama === selectedYear);
    if (!year) return;
    const response = await apiFetch(`/api/master/tahun-ajaran/${year.id}/aktif`, {
      method: 'PUT', headers: {}
    });
    if (!response.ok) { setErrorMsg('Gagal mengaktifkan tahun ajaran.'); return; }
    await fetchData();
    setSuccessMsg(`${year.nama} ditetapkan sebagai tahun ajaran aktif.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const saveTeachingAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await apiFetch('/api/master/penugasan/mapel', {
      method: 'POST', headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify({ ...assignmentForm, tahunAjaran: selectedYear })
    });
    const data = await response.json();
    if (!response.ok) { setErrorMsg(data.error || 'Gagal menyimpan penugasan mapel.'); return; }
    setSuccessMsg('Penugasan guru mata pelajaran berhasil disimpan.');
    setTimeout(() => setSuccessMsg(''), 3000);
    setAssignmentForm((previous) => ({ ...previous, mapelId: '', guruId: '' }));
    const responseList = await apiFetch(`/api/master/penugasan?tahunAjaran=${encodeURIComponent(selectedYear)}`, { headers: {} });
    if (responseList.ok) setTeachingAssignments((await responseList.json()).kelasMapel || []);
  };

  const saveHomeroomAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await apiFetch('/api/master/penugasan/wali', {
      method: 'POST', headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify({ ...homeroomForm, tahunAjaran: selectedYear })
    });
    const data = await response.json();
    if (!response.ok) { setErrorMsg(data.error || 'Gagal menyimpan wali kelas.'); return; }
    setSuccessMsg('Penugasan wali kelas berhasil disimpan.');
    setTimeout(() => setSuccessMsg(''), 3000);
    setHomeroomForm({ kelasId: '', guruId: '' });
    fetchData();
  };

  const saveStudentEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await apiFetch(`/api/master/siswa/${enrollmentForm.siswaId}/kelas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kelasId: enrollmentForm.kelasId, tahunAjaran: selectedYear })
    });
    const data = await response.json();
    if (!response.ok) { setErrorMsg(data.error || 'Gagal menyimpan riwayat kelas siswa.'); return; }
    setSuccessMsg(`Riwayat kelas ${selectedYear} berhasil disimpan.`);
    setTimeout(() => setSuccessMsg(''), 3000);
    const responseList = await apiFetch(`/api/master/siswa?tahunAjaran=${encodeURIComponent(selectedYear)}`);
    if (responseList.ok) setStudentList(await responseList.json());
    setEnrollmentForm({ siswaId: '', kelasId: '' });
  };

  // Handlers Kelas
  const openAddKelas = () => {
    setEditingKelasId(null);
    setFormKelas({ nama: '', tingkat: '', waliId: '' });
    setErrorMsg('');
    setIsModalKelasOpen(true);
  };

  const openEditKelas = (k: Kelas) => {
    setEditingKelasId(k.id);
    setFormKelas({ nama: k.nama, tingkat: String(k.tingkat), waliId: k.waliId || '' });
    setErrorMsg('');
    setIsModalKelasOpen(true);
  };

  const handleSubmitKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const url = editingKelasId
        ? `/api/master/kelas/${editingKelasId}`
        : '/api/master/kelas';
      const method = editingKelasId ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ ...formKelas, tahunAjaran: selectedYear }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses kelas');

      setIsModalKelasOpen(false);
      setFormKelas({ nama: '', tingkat: '', waliId: '' });
      setSuccessMsg(editingKelasId ? 'Kelas berhasil diperbarui!' : 'Kelas berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal menyimpan kelas.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers Mapel
  const openAddMapel = () => {
    setEditingMapelId(null);
    setFormMapel({ nama: '', kkm: '', guruId: '' });
    setErrorMsg('');
    setIsModalMapelOpen(true);
  };

  const openEditMapel = (m: Mapel) => {
    setEditingMapelId(m.id);
    setFormMapel({ nama: m.nama, kkm: String(m.kkm), guruId: m.guruId || '' });
    setErrorMsg('');
    setIsModalMapelOpen(true);
  };

  const handleSubmitMapel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const url = editingMapelId
        ? `/api/master/mapel/${editingMapelId}`
        : '/api/master/mapel';
      const method = editingMapelId ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify(formMapel),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses mapel');

      setIsModalMapelOpen(false);
      setFormMapel({ nama: '', kkm: '', guruId: '' });
      setSuccessMsg(editingMapelId ? 'Mata pelajaran berhasil diperbarui!' : 'Mata pelajaran berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal menyimpan mata pelajaran.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers Hapus
  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const url = `/api/master/${deletingItem.type}/${deletingItem.id}`;

      const res = await apiFetch(url, {
        method: 'DELETE',
        headers: {}
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Gagal menghapus ${deletingItem.type}`);

      setDeletingItem(null);
      setSuccessMsg(`Data ${deletingItem.type === 'kelas' ? 'kelas' : 'mata pelajaran'} berhasil dihapus!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal menghapus data akademik.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const currentYearObj = yearList.find((y) => y.nama === selectedYear);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-separator/40">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2 border border-emerald-200/60 dark:border-emerald-800/40">
            <School size={14} />
            <span>Struktur Kurikulum & Penugasan</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-label leading-tight">
            Data Akademik
          </h1>
          <p className="text-sm text-label-secondary mt-1">
            Manajemen kelas, mata pelajaran, penugasan guru, dan tahun ajaran aktif
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-fill/60 border border-separator/40 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('struktur')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'struktur'
                ? 'bg-bg text-emerald-900 dark:text-emerald-300 shadow-xs border border-separator/40'
                : 'text-label-secondary hover:text-label'
            }`}
          >
            <Layers size={14} />
            <span>Kelas & Mata Pelajaran</span>
          </button>
          <button
            onClick={() => setActiveTab('penugasan')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'penugasan'
                ? 'bg-bg text-emerald-900 dark:text-emerald-300 shadow-xs border border-separator/40'
                : 'text-label-secondary hover:text-label'
            }`}
          >
            <Calendar size={14} />
            <span>Tahun Ajaran & Matriks Penugasan</span>
          </button>
        </div>
      </header>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
          <p className="text-xs sm:text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && !isModalKelasOpen && !isModalMapelOpen && !deletingItem && (
        <div className="p-3.5 rounded-xl flex items-center gap-2.5 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800/60 shadow-xs animate-in fade-in duration-200">
          <AlertCircle size={18} className="text-red-700 dark:text-red-400 shrink-0" />
          <p className="text-xs sm:text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* TAB 1: Struktur Kelas & Mata Pelajaran */}
      {activeTab === 'struktur' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kolom Tabel Kelas */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50">
                  <School size={16} />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base text-label">Kelas</h2>
                  <p className="text-[11px] text-label-secondary">Tingkat 7, 8, dan 9 SMP Al-Hidayah</p>
                </div>
              </div>
              {isAdmin && (
                <button 
                  onClick={openAddKelas} 
                  className="h-8.5 px-3 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Plus size={15} /> <span>Tambah Kelas</span>
                </button>
              )}
            </div>
            
            <section className="bg-bg-secondary rounded-2xl border border-separator/40 shadow-xs overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-separator/40 bg-fill/40">
                      <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">NAMA KELAS</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">WALI KELAS</th>
                      {isAdmin && (
                        <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider text-right w-20">AKSI</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="text-xs text-label divide-y divide-separator/30">
                    {isLoading ? (
                      <tr><td colSpan={isAdmin ? 3 : 2} className="p-8 text-center text-label-secondary"><RefreshCw size={20} className="animate-spin text-emerald-800 mx-auto mb-2" />Memuat kelas...</td></tr> 
                    ) : kelasList.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 3 : 2} className="p-8 text-center text-label-tertiary">
                          <Inbox size={32} className="mx-auto mb-2" strokeWidth={1.5} />
                          <p className="font-medium text-xs">Belum ada kelas terdaftar</p>
                        </td>
                      </tr>
                    ) : (
                      kelasList.map((k) => (
                        <tr key={k.id} className="hover:bg-fill/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-label">
                            <span className="font-mono text-emerald-900 dark:text-emerald-300 font-bold">{k.nama}</span>
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-fill text-label-secondary font-normal border border-separator/30">
                              Tingkat {k.tingkat}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-label-secondary">
                            {k.wali ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-label font-medium">
                                <UserCheck size={13} className="text-emerald-700" />
                                {k.wali.nama}
                              </span>
                            ) : (
                              <span className="text-xs text-label-tertiary italic">Belum ditentukan</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditKelas(k)}
                                  className="p-1.5 rounded-lg hover:bg-fill text-label-secondary hover:text-emerald-800 dark:hover:text-emerald-400 transition-colors"
                                  title="Edit Kelas"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => setDeletingItem({ type: 'kelas', id: k.id, name: k.nama })}
                                  className="p-1.5 rounded-lg hover:bg-fill text-label-secondary hover:text-red-600 transition-colors"
                                  title="Hapus Kelas"
                                >
                                  <Trash2 size={14} />
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
            </section>
          </div>

          {/* Kolom Tabel Mapel */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/50">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base text-label">Mata Pelajaran (Kurikulum)</h2>
                  <p className="text-[11px] text-label-secondary">Ambang batas KKM default: 75.0</p>
                </div>
              </div>
              {isAdmin && (
                <button 
                  onClick={openAddMapel} 
                  className="h-8.5 px-3 rounded-lg text-xs font-semibold text-white bg-amber-700 hover:bg-amber-600 active:scale-95 transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Plus size={15} /> <span>Tambah Mapel</span>
                </button>
              )}
            </div>
            
            <section className="bg-bg-secondary rounded-2xl border border-separator/40 shadow-xs overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-separator/40 bg-fill/40">
                      <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">MATA PELAJARAN</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider text-center w-20">KKM</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">PENGAMPU UTAMA</th>
                      {isAdmin && (
                        <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider text-right w-20">AKSI</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="text-xs text-label divide-y divide-separator/30">
                    {isLoading ? (
                      <tr><td colSpan={isAdmin ? 4 : 3} className="p-8 text-center text-label-secondary"><RefreshCw size={20} className="animate-spin text-amber-700 mx-auto mb-2" />Memuat mapel...</td></tr> 
                    ) : mapelList.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 4 : 3} className="p-8 text-center text-label-tertiary">
                          <Inbox size={32} className="mx-auto mb-2" strokeWidth={1.5} />
                          <p className="font-medium text-xs">Belum ada mata pelajaran terdaftar</p>
                        </td>
                      </tr>
                    ) : (
                      mapelList.map((m) => (
                        <tr key={m.id} className="hover:bg-fill/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-label">{m.nama}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/50">
                              {m.kkm}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-label-secondary">
                            {m.guru?.nama ? (
                              <span className="text-xs text-label font-medium">{m.guru.nama}</span>
                            ) : (
                              <span className="text-xs text-label-tertiary italic">Ditentukan per kelas</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditMapel(m)}
                                  className="p-1.5 rounded-lg hover:bg-fill text-label-secondary hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                                  title="Edit Mapel"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => setDeletingItem({ type: 'mapel', id: m.id, name: m.nama })}
                                  className="p-1.5 rounded-lg hover:bg-fill text-label-secondary hover:text-red-600 transition-colors"
                                  title="Hapus Mapel"
                                >
                                  <Trash2 size={14} />
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
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: Tahun Ajaran & Matriks Penugasan */}
      {activeTab === 'penugasan' && (
        <div className="flex flex-col gap-6">
          {/* Card Tahun Ajaran Aktif */}
          <section className="bg-bg-secondary rounded-2xl border border-separator/40 p-5 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-separator/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base text-label">Pengaturan Tahun Ajaran</h2>
                  <p className="text-xs text-label-secondary">
                    Tahun ajaran terpilih saat ini: <strong className="text-label">{selectedYear || 'Belum dipilih'}</strong>
                    {currentYearObj?.aktif && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold uppercase tracking-wider">
                        Aktif
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <select 
                  id="academic-year" 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)} 
                  className="h-9 px-3 rounded-xl bg-fill text-label text-xs font-semibold border border-separator/40 focus:outline-none focus:ring-2 focus:ring-emerald-700/50 cursor-pointer"
                >
                  {yearList.map((year) => (
                    <option key={year.id} value={year.nama}>
                      {year.nama} {year.aktif ? '✓ (Aktif)' : ''}
                    </option>
                  ))}
                </select>

                {isAdmin && selectedYear && !currentYearObj?.aktif && (
                  <button 
                    onClick={activateAcademicYear} 
                    className="h-9 px-3.5 rounded-xl border border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold transition-colors"
                  >
                    Jadikan Tahun Aktif
                  </button>
                )}

                {isAdmin && (
                  <form onSubmit={createAcademicYear} className="flex items-center gap-2">
                    <input 
                      value={newYear} 
                      onChange={(e) => setNewYear(e.target.value)} 
                      placeholder="2026/2027" 
                      pattern="[0-9]{4}/[0-9]{4}" 
                      required 
                      className="h-9 w-28 px-3 rounded-xl bg-fill text-label text-xs font-mono border border-separator/40 focus:outline-none focus:ring-2 focus:ring-emerald-700/50" 
                    />
                    <button className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all shadow-xs">
                      Tambah Tahun
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Matriks Penugasan 3 Formulir Terpadu */}
            {selectedYear && isAdmin && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-1">
                {/* 1. Guru Pengampu Mapel */}
                <form onSubmit={saveTeachingAssignment} className="p-4 rounded-xl bg-fill/30 border border-separator/40 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-amber-700" />
                    <h3 className="font-serif font-bold text-xs text-label">Penugasan Guru Mapel</h3>
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-label-secondary">Kelas</label>
                    <select required value={assignmentForm.kelasId} onChange={(e) => setAssignmentForm({ ...assignmentForm, kelasId: e.target.value })} className="h-9 w-full px-2.5 rounded-lg bg-bg text-xs border border-separator/40">
                      <option value="">Pilih Kelas</option>
                      {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-label-secondary">Mata Pelajaran</label>
                    <select required value={assignmentForm.mapelId} onChange={(e) => setAssignmentForm({ ...assignmentForm, mapelId: e.target.value })} className="h-9 w-full px-2.5 rounded-lg bg-bg text-xs border border-separator/40">
                      <option value="">Pilih Mapel</option>
                      {mapelList.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-label-secondary">Guru Pengampu</label>
                    <select required value={assignmentForm.guruId} onChange={(e) => setAssignmentForm({ ...assignmentForm, guruId: e.target.value })} className="h-9 w-full px-2.5 rounded-lg bg-bg text-xs border border-separator/40">
                      <option value="">Pilih Guru</option>
                      {guruList.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
                    </select>
                  </div>
                  <button className="h-9 mt-1 px-4 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-semibold transition-all shadow-xs">
                    Simpan Pengampu Mapel
                  </button>
                </form>

                {/* 2. Penetapan Wali Kelas */}
                <form onSubmit={saveHomeroomAssignment} className="p-4 rounded-xl bg-fill/30 border border-separator/40 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-emerald-800 dark:text-emerald-400" />
                    <h3 className="font-serif font-bold text-xs text-label">Penetapan Wali Kelas</h3>
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-label-secondary">Kelas Target</label>
                    <select required value={homeroomForm.kelasId} onChange={(e) => setHomeroomForm({ ...homeroomForm, kelasId: e.target.value })} className="h-9 w-full px-2.5 rounded-lg bg-bg text-xs border border-separator/40">
                      <option value="">Pilih Kelas</option>
                      {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-label-secondary">Guru Wali</label>
                    <select required value={homeroomForm.guruId} onChange={(e) => setHomeroomForm({ ...homeroomForm, guruId: e.target.value })} className="h-9 w-full px-2.5 rounded-lg bg-bg text-xs border border-separator/40">
                      <option value="">Pilih Guru</option>
                      {guruList.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
                    </select>
                  </div>
                  <div className="text-[11px] text-label-secondary italic pt-2">
                    Wali kelas bertugas mengisi rekapitulasi kehadiran, catatan sikap spiritual/sosial, serta mencetak rapor akhir.
                  </div>
                  <button className="h-9 mt-auto px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all shadow-xs">
                    Tetapkan Wali Kelas
                  </button>
                </form>

                {/* 3. Penempatan Riwayat Siswa */}
                <form onSubmit={saveStudentEnrollment} className="p-4 rounded-xl bg-fill/30 border border-separator/40 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={16} className="text-emerald-800 dark:text-emerald-400" />
                    <h3 className="font-serif font-bold text-xs text-label">Penempatan Riwayat Kelas Siswa</h3>
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-label-secondary">Peserta Didik</label>
                    <select required value={enrollmentForm.siswaId} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, siswaId: e.target.value })} className="h-9 w-full px-2.5 rounded-lg bg-bg text-xs border border-separator/40">
                      <option value="">Pilih Siswa</option>
                      {studentList.map((s) => <option key={s.id} value={s.id}>{s.nama} ({s.nisn})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-label-secondary">Kelas {selectedYear}</label>
                    <select required value={enrollmentForm.kelasId} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, kelasId: e.target.value })} className="h-9 w-full px-2.5 rounded-lg bg-bg text-xs border border-separator/40">
                      <option value="">Pilih Kelas</option>
                      {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </select>
                  </div>
                  <div className="text-[11px] text-label-secondary italic pt-2">
                    Menyimpan riwayat kenaikan jenjang untuk buku induk siswa SMP Al-Hidayah.
                  </div>
                  <button className="h-9 mt-auto px-4 rounded-lg border border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold transition-colors">
                    Simpan Riwayat Kelas
                  </button>
                </form>
              </div>
            )}
          </section>

          {/* Tabel Rekapitulasi Pengampu Tahun Ajaran Terpilih */}
          <section className="bg-bg-secondary rounded-2xl border border-separator/40 shadow-xs overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 bg-fill/40 border-b border-separator/40 flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-label">
                Daftar Guru Pengampu Mapel — Tahun Ajaran {selectedYear}
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-fill text-label-secondary font-semibold tabular-nums border border-separator/30">
                {teachingAssignments.length} Penugasan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-separator/40 bg-fill/20">
                    <th className="px-5 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider w-36">KELAS</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">MATA PELAJARAN</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">GURU PENGAMPU</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-label divide-y divide-separator/30">
                  {teachingAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-center text-label-secondary">
                        <Inbox size={28} className="mx-auto mb-1.5 text-label-tertiary" />
                        <span>Belum ada penugasan guru mata pelajaran untuk tahun ajaran {selectedYear}.</span>
                      </td>
                    </tr>
                  ) : (
                    teachingAssignments.map((a) => (
                      <tr key={a.id} className="hover:bg-fill/40 transition-colors">
                        <td className="px-5 py-3 font-semibold text-emerald-900 dark:text-emerald-300 font-mono">{a.kelas.nama}</td>
                        <td className="px-5 py-3 font-medium text-label">{a.mapel.nama}</td>
                        <td className="px-5 py-3 text-label-secondary flex items-center gap-1.5">
                          <UserCheck size={13} className="text-emerald-700" />
                          <span>{a.guru.nama}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Modal Tambah / Edit Kelas */}
      {isModalKelasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-bg-secondary border border-separator/40 rounded-2xl shadow-xl p-6 relative flex flex-col gap-5">
            <button 
              onClick={() => setIsModalKelasOpen(false)} 
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-fill transition-colors text-label-secondary"
            >
              <X size={20} />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400 mb-1">
                <School size={15} />
                <span>Formulir Kelas</span>
              </div>
              <h2 className="text-xl font-serif font-bold text-label">
                {editingKelasId ? 'Perbarui Data Kelas' : 'Tambah Kelas Baru'}
              </h2>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl flex items-start gap-2 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-200 text-xs font-medium">
                <AlertCircle size={16} className="text-red-700 mt-0.5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmitKelas} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Nama Kelas (Contoh: VII-A, VIII-1)</label>
                <input 
                  type="text" required value={formKelas.nama} 
                  placeholder="Contoh: VII-A"
                  onChange={(e) => setFormKelas({ ...formKelas, nama: e.target.value })} 
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator/40 focus:outline-none focus:ring-2 focus:ring-emerald-700/50" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Tingkat Jenjang SMP</label>
                <select 
                  required 
                  value={formKelas.tingkat} 
                  onChange={(e) => setFormKelas({ ...formKelas, tingkat: e.target.value })} 
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator/40 focus:outline-none focus:ring-2 focus:ring-emerald-700/50 cursor-pointer"
                >
                  <option value="" className="bg-bg text-label">-- Pilih Tingkat --</option>
                  <option value="7" className="bg-bg text-label">Tingkat 7 (Kelas VII)</option>
                  <option value="8" className="bg-bg text-label">Tingkat 8 (Kelas VIII)</option>
                  <option value="9" className="bg-bg text-label">Tingkat 9 (Kelas IX)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Wali Kelas (Opsional)</label>
                <select 
                  value={formKelas.waliId} 
                  onChange={(e) => setFormKelas({ ...formKelas, waliId: e.target.value })} 
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator/40 focus:outline-none focus:ring-2 focus:ring-emerald-700/50 cursor-pointer"
                >
                  <option value="" className="bg-bg text-label">-- Tanpa Wali Kelas --</option>
                  {guruList.map(g => <option key={g.id} value={g.id} className="bg-bg text-label">{g.nama}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-separator/40 mt-1">
                <button 
                  type="button" 
                  onClick={() => setIsModalKelasOpen(false)} 
                  className="h-10 px-4 rounded-xl text-xs font-semibold text-label hover:bg-fill transition-colors border border-separator/40"
                >
                  Batal
                </button>
                <button 
                  type="submit" disabled={isSubmitting} 
                  className="h-10 px-5 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Menyimpan...' : editingKelasId ? 'Simpan Perubahan' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Mapel */}
      {isModalMapelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-bg-secondary border border-separator/40 rounded-2xl shadow-xl p-6 relative flex flex-col gap-5">
            <button 
              onClick={() => setIsModalMapelOpen(false)} 
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-fill transition-colors text-label-secondary"
            >
              <X size={20} />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                <BookOpen size={15} />
                <span>Formulir Mata Pelajaran</span>
              </div>
              <h2 className="text-xl font-serif font-bold text-label">
                {editingMapelId ? 'Perbarui Mata Pelajaran' : 'Tambah Mapel Baru'}
              </h2>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl flex items-start gap-2 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-200 text-xs font-medium">
                <AlertCircle size={16} className="text-red-700 mt-0.5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmitMapel} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Nama Mata Pelajaran</label>
                <input 
                  type="text" required value={formMapel.nama} 
                  onChange={(e) => setFormMapel({ ...formMapel, nama: e.target.value })} 
                  placeholder="Contoh: Pendidikan Agama Islam & Budi Pekerti"
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator/40 focus:outline-none focus:ring-2 focus:ring-amber-600/50" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Batas Ambang KKM (Skala 0 - 100)</label>
                <input 
                  type="number" required value={formMapel.kkm} 
                  onChange={(e) => setFormMapel({ ...formMapel, kkm: e.target.value })} 
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm font-mono border border-separator/40 focus:outline-none focus:ring-2 focus:ring-amber-600/50" 
                  placeholder="75" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Guru Koordinator Pengampu (Opsional)</label>
                <select 
                  value={formMapel.guruId} 
                  onChange={(e) => setFormMapel({ ...formMapel, guruId: e.target.value })} 
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator/40 focus:outline-none focus:ring-2 focus:ring-amber-600/50 cursor-pointer"
                >
                  <option value="" className="bg-bg text-label">-- Tanpa Guru Koordinator --</option>
                  {guruList.map(g => <option key={g.id} value={g.id} className="bg-bg text-label">{g.nama}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-separator/40 mt-1">
                <button 
                  type="button" 
                  onClick={() => setIsModalMapelOpen(false)} 
                  className="h-10 px-4 rounded-xl text-xs font-semibold text-label hover:bg-fill transition-colors border border-separator/40"
                >
                  Batal
                </button>
                <button 
                  type="submit" disabled={isSubmitting} 
                  className="h-10 px-5 rounded-xl text-xs font-semibold text-white bg-amber-700 hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Menyimpan...' : editingMapelId ? 'Simpan Perubahan' : 'Simpan Mapel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Kelas / Mapel */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-bg-secondary border border-separator/40 rounded-2xl shadow-xl p-6 relative flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200/50 dark:border-red-900/40">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-label">
                  Hapus {deletingItem.type === 'kelas' ? 'Kelas' : 'Mata Pelajaran'}?
                </h3>
                <p className="text-xs text-label-secondary">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-label-secondary leading-relaxed bg-fill/50 p-3 rounded-xl border border-separator/30">
              Apakah Anda yakin ingin menghapus data <strong className="text-label">{deletingItem.name}</strong>? Seluruh rekaman nilai dan penugasan terkait akan terpengaruh.
            </p>

            {errorMsg && (
              <div className="p-3 rounded-xl text-xs bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2 border-t border-separator/40">
              <button
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="h-10 px-4 rounded-xl text-xs font-semibold text-label hover:bg-fill transition-colors border border-separator/40"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteItem}
                disabled={isDeleting}
                className="h-10 px-5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
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
