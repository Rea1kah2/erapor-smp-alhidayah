// frontend/src/app/dashboard/akademik/page.tsx
'use client';
import { apiFetch } from "@/lib/api";
import { errorMessage } from '@/lib/errors';
import { useState, useEffect, useCallback } from 'react';
import { Plus, X, AlertCircle, Inbox, School, BookOpen, Pencil, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';

interface Guru { id: string; nama: string; }
interface Kelas { id: string; nama: string; tingkat: number; waliId?: string | null; wali: { nama: string } | null; }
interface Mapel { id: string; nama: string; kkm: number; guruId?: string | null; guru: { nama: string } | null; }
interface AcademicYear { id: string; nama: string; aktif: boolean; }
interface TeachingAssignment { id: string; guru: Guru; mapel: Mapel; kelas: Kelas; }
interface Student { id: string; nama: string; nisn: string; kelasId: string | null; }

export default function DataAkademik() {
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
    queueMicrotask(() => { void fetchData(); });
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
      setSuccessMsg(editingMapelId ? 'Mapel berhasil diperbarui!' : 'Mapel berhasil ditambahkan!');
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

  return (
    <div className="flex flex-col gap-8">
      {/* Header Halaman */}
      <header>
        <h1 className="text-[28px] font-bold text-label leading-tight">Data Akademik</h1>
        <p className="text-[15px] text-label-secondary">Manajemen kelas dan mata pelajaran</p>
      </header>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl flex items-center gap-2.5 bg-[color-mix(in_srgb,var(--green)_15%,transparent)] text-label border border-[color-mix(in_srgb,var(--green)_30%,transparent)] shadow-sm">
          <CheckCircle2 size={18} className="text-[var(--green)] shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && !isModalKelasOpen && !isModalMapelOpen && !deletingItem && (
        <div className="p-3.5 rounded-2xl flex items-center gap-2.5 bg-[color-mix(in_srgb,var(--red)_15%,transparent)] text-label border border-[color-mix(in_srgb,var(--red)_30%,transparent)] shadow-sm">
          <AlertCircle size={18} className="text-[var(--red)] shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <section className="rounded-[24px] bg-bg-secondary p-5 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Tahun Ajaran dan Penugasan</h2>
            <label className="text-xs text-label-secondary" htmlFor="academic-year">Tahun ajaran yang dikelola</label>
            <select id="academic-year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="h-10 min-w-56 px-3 rounded-xl bg-fill text-label">
              {yearList.map((year) => <option key={year.id} value={year.nama}>{year.nama}{year.aktif ? ' (Aktif)' : ''}</option>)}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <form onSubmit={createAcademicYear} className="flex gap-2">
              <input value={newYear} onChange={(e) => setNewYear(e.target.value)} placeholder="2026/2027" pattern="[0-9]{4}/[0-9]{4}" required className="h-10 w-36 px-3 rounded-xl bg-fill text-sm" />
              <button className="h-10 px-4 rounded-full bg-accent text-white text-sm font-semibold">Tambah Tahun</button>
            </form>
            {selectedYear && !yearList.find((year) => year.nama === selectedYear)?.aktif && (
              <button onClick={activateAcademicYear} className="h-10 px-4 rounded-full border border-accent text-accent text-sm font-semibold">Jadikan Aktif</button>
            )}
          </div>
        </div>

        {selectedYear && <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 border-t border-separator/40 pt-5">
          <form onSubmit={saveTeachingAssignment} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1"><label className="block mb-1 text-xs text-label-secondary">Kelas</label><select required value={assignmentForm.kelasId} onChange={(e) => setAssignmentForm({ ...assignmentForm, kelasId: e.target.value })} className="h-10 w-full px-3 rounded-xl bg-fill"><option value="">Pilih kelas</option>{kelasList.map((kelas) => <option key={kelas.id} value={kelas.id}>{kelas.nama}</option>)}</select></div>
            <div className="flex-1"><label className="block mb-1 text-xs text-label-secondary">Mata pelajaran</label><select required value={assignmentForm.mapelId} onChange={(e) => setAssignmentForm({ ...assignmentForm, mapelId: e.target.value })} className="h-10 w-full px-3 rounded-xl bg-fill"><option value="">Pilih mapel</option>{mapelList.map((mapel) => <option key={mapel.id} value={mapel.id}>{mapel.nama}</option>)}</select></div>
            <div className="flex-1"><label className="block mb-1 text-xs text-label-secondary">Guru pengampu</label><select required value={assignmentForm.guruId} onChange={(e) => setAssignmentForm({ ...assignmentForm, guruId: e.target.value })} className="h-10 w-full px-3 rounded-xl bg-fill"><option value="">Pilih guru</option>{guruList.map((guru) => <option key={guru.id} value={guru.id}>{guru.nama}</option>)}</select></div>
            <button className="h-10 px-4 rounded-full bg-accent text-white text-sm font-semibold">Simpan Mapel</button>
          </form>
          <form onSubmit={saveHomeroomAssignment} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1"><label className="block mb-1 text-xs text-label-secondary">Kelas wali</label><select required value={homeroomForm.kelasId} onChange={(e) => setHomeroomForm({ ...homeroomForm, kelasId: e.target.value })} className="h-10 w-full px-3 rounded-xl bg-fill"><option value="">Pilih kelas</option>{kelasList.map((kelas) => <option key={kelas.id} value={kelas.id}>{kelas.nama}</option>)}</select></div>
            <div className="flex-1"><label className="block mb-1 text-xs text-label-secondary">Wali kelas</label><select required value={homeroomForm.guruId} onChange={(e) => setHomeroomForm({ ...homeroomForm, guruId: e.target.value })} className="h-10 w-full px-3 rounded-xl bg-fill"><option value="">Pilih guru</option>{guruList.map((guru) => <option key={guru.id} value={guru.id}>{guru.nama}</option>)}</select></div>
            <button className="h-10 px-4 rounded-full border border-accent text-accent text-sm font-semibold">Simpan Wali</button>
          </form>
          <form onSubmit={saveStudentEnrollment} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1"><label className="block mb-1 text-xs text-label-secondary">Siswa</label><select required value={enrollmentForm.siswaId} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, siswaId: e.target.value })} className="h-10 w-full px-3 rounded-xl bg-fill"><option value="">Pilih siswa</option>{studentList.map((student) => <option key={student.id} value={student.id}>{student.nama} ({student.nisn})</option>)}</select></div>
            <div className="flex-1"><label className="block mb-1 text-xs text-label-secondary">Kelas {selectedYear}</label><select required value={enrollmentForm.kelasId} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, kelasId: e.target.value })} className="h-10 w-full px-3 rounded-xl bg-fill"><option value="">Pilih kelas</option>{kelasList.map((kelas) => <option key={kelas.id} value={kelas.id}>{kelas.nama}</option>)}</select></div>
            <button className="h-10 px-4 rounded-full border border-accent text-accent text-sm font-semibold">Simpan Riwayat Kelas</button>
          </form>
        </div>}

        <div className="border-t border-separator/40 pt-4">
          <h3 className="mb-2 text-sm font-semibold">Daftar pengampu {selectedYear}</h3>
          {teachingAssignments.length === 0 ? <p className="text-sm text-label-secondary">Belum ada penugasan mapel untuk tahun ajaran ini.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-label-secondary"><th className="py-2">Kelas</th><th>Mapel</th><th>Guru</th></tr></thead><tbody>{teachingAssignments.map((assignment) => <tr key={assignment.id} className="border-t border-separator/30"><td className="py-2">{assignment.kelas.nama}</td><td>{assignment.mapel.nama}</td><td>{assignment.guru.nama}</td></tr>)}</tbody></table></div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Tabel Kelas */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <School size={20} className="text-accent" /> Tabel Kelas
            </h2>
            <button 
              onClick={openAddKelas} 
              className="text-sm font-semibold text-accent hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 active:scale-95"
            >
              <Plus size={16} /> Tambah
            </button>
          </div>
          
          <section className="bg-bg-secondary rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-[0.5px] border-separator bg-bg/40">
                    <th className="px-5 py-3 text-[13px] font-semibold text-label-secondary">NAMA KELAS</th>
                    <th className="px-5 py-3 text-[13px] font-semibold text-label-secondary">WALI KELAS</th>
                    <th className="px-5 py-3 text-[13px] font-semibold text-label-secondary text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="text-[14px] text-label divide-y divide-separator/40">
                  {isLoading ? (
                    <tr><td colSpan={3} className="p-6 text-center text-label-secondary">Memuat...</td></tr> 
                  ) : kelasList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-label-tertiary">
                        <Inbox size={32} className="mx-auto mb-2" strokeWidth={1.5} />Belum ada kelas
                      </td>
                    </tr>
                  ) : (
                    kelasList.map((k) => (
                      <tr key={k.id} className="hover:bg-fill/50 transition-colors">
                        <td className="px-5 py-3 font-semibold">
                          {k.nama} <span className="text-xs font-normal text-label-secondary ml-1">(Tk. {k.tingkat})</span>
                        </td>
                        <td className="px-5 py-3 text-label-secondary">{k.wali?.nama || '-'}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditKelas(k)}
                              className="p-1.5 rounded-full hover:bg-fill text-label-secondary hover:text-accent transition-colors"
                              title="Edit Kelas"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeletingItem({ type: 'kelas', id: k.id, name: k.nama })}
                              className="p-1.5 rounded-full hover:bg-fill text-label-secondary hover:text-[var(--red)] transition-colors"
                              title="Hapus Kelas"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Kolom Tabel Mapel */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BookOpen size={20} className="text-[#af52de]" /> Tabel Mapel
            </h2>
            <button 
              onClick={openAddMapel} 
              className="text-sm font-semibold text-[#af52de] hover:bg-[color-mix(in_srgb,#af52de_12%,transparent)] px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 active:scale-95"
            >
              <Plus size={16} /> Tambah
            </button>
          </div>
          
          <section className="bg-bg-secondary rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-[0.5px] border-separator bg-bg/40">
                    <th className="px-5 py-3 text-[13px] font-semibold text-label-secondary">MATA PELAJARAN</th>
                    <th className="px-5 py-3 text-[13px] font-semibold text-label-secondary">KKM</th>
                    <th className="px-5 py-3 text-[13px] font-semibold text-label-secondary">PENGAMPU</th>
                    <th className="px-5 py-3 text-[13px] font-semibold text-label-secondary text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="text-[14px] text-label divide-y divide-separator/40">
                  {isLoading ? (
                    <tr><td colSpan={4} className="p-6 text-center text-label-secondary">Memuat...</td></tr> 
                  ) : mapelList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-label-tertiary">
                        <Inbox size={32} className="mx-auto mb-2" strokeWidth={1.5} />Belum ada mapel
                      </td>
                    </tr>
                  ) : (
                    mapelList.map((m) => (
                      <tr key={m.id} className="hover:bg-fill/50 transition-colors">
                        <td className="px-5 py-3 font-semibold">{m.nama}</td>
                        <td className="px-5 py-3 tabular-nums text-label-secondary">{m.kkm}</td>
                        <td className="px-5 py-3 text-label-secondary">{m.guru?.nama || '-'}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditMapel(m)}
                              className="p-1.5 rounded-full hover:bg-fill text-label-secondary hover:text-[#af52de] transition-colors"
                              title="Edit Mapel"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeletingItem({ type: 'mapel', id: m.id, name: m.nama })}
                              className="p-1.5 rounded-full hover:bg-fill text-label-secondary hover:text-[var(--red)] transition-colors"
                              title="Hapus Mapel"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {/* Modal Tambah / Edit Kelas */}
      {isModalKelasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass glass-thick w-full max-w-md p-6 relative flex flex-col gap-6" style={{ '--glass-radius': 'var(--radius-2xl)' } as React.CSSProperties}>
            <button onClick={() => setIsModalKelasOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-fill transition-colors text-label-secondary">
              <X size={22} />
            </button>
            <div>
              <h2 className="text-[22px] font-semibold text-label">
                {editingKelasId ? 'Edit Kelas' : 'Tambah Kelas'}
              </h2>
            </div>
            {errorMsg && (
              <div className="p-3 rounded-lg flex items-start gap-2 bg-[color-mix(in_srgb,var(--red)_12%,transparent)] text-label">
                <AlertCircle size={18} className="text-[var(--red)] mt-0.5 shrink-0" />
                <p className="text-sm font-medium">{errorMsg}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmitKelas} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-label">Nama Kelas (Contoh: VII-A, VIII-1)</label>
                <input 
                  type="text" required value={formKelas.nama} 
                  placeholder="Contoh: VII-A"
                  onChange={(e) => setFormKelas({ ...formKelas, nama: e.target.value })} 
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-label">Tingkat Jenjang SMP</label>
                <select 
                  required 
                  value={formKelas.tingkat} 
                  onChange={(e) => setFormKelas({ ...formKelas, tingkat: e.target.value })} 
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                >
                  <option value="" className="bg-bg text-label">-- Pilih Tingkat --</option>
                  <option value="7" className="bg-bg text-label">Tingkat 7 (Kelas VII)</option>
                  <option value="8" className="bg-bg text-label">Tingkat 8 (Kelas VIII)</option>
                  <option value="9" className="bg-bg text-label">Tingkat 9 (Kelas IX)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-label">Wali Kelas (Opsional)</label>
                <select 
                  value={formKelas.waliId} 
                  onChange={(e) => setFormKelas({ ...formKelas, waliId: e.target.value })} 
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                >
                  <option value="" className="bg-bg text-label">-- Tanpa Wali Kelas --</option>
                  {guruList.map(g => <option key={g.id} value={g.id} className="bg-bg text-label">{g.nama}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setIsModalKelasOpen(false)} className="h-11 px-5 rounded-full font-semibold text-label hover:bg-fill transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="glass glass-accent h-11 px-6 rounded-full font-semibold text-white active:scale-95 transition-transform disabled:opacity-50">
                  {isSubmitting ? 'Menyimpan...' : editingKelasId ? 'Simpan Perubahan' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Mapel */}
      {isModalMapelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass glass-thick w-full max-w-md p-6 relative flex flex-col gap-6" style={{ '--glass-radius': 'var(--radius-2xl)' } as React.CSSProperties}>
            <button onClick={() => setIsModalMapelOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-fill transition-colors text-label-secondary">
              <X size={22} />
            </button>
            <div>
              <h2 className="text-[22px] font-semibold text-label">
                {editingMapelId ? 'Edit Mata Pelajaran' : 'Tambah Mapel'}
              </h2>
            </div>
            {errorMsg && (
              <div className="p-3 rounded-lg flex items-start gap-2 bg-[color-mix(in_srgb,var(--red)_12%,transparent)] text-label">
                <AlertCircle size={18} className="text-[var(--red)] mt-0.5 shrink-0" />
                <p className="text-sm font-medium">{errorMsg}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmitMapel} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-label">Nama Mapel</label>
                <input 
                  type="text" required value={formMapel.nama} 
                  onChange={(e) => setFormMapel({ ...formMapel, nama: e.target.value })} 
                  placeholder="Contoh: Matematika Wajib"
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-label">Batas KKM (Angka)</label>
                <input 
                  type="number" required value={formMapel.kkm} 
                  onChange={(e) => setFormMapel({ ...formMapel, kkm: e.target.value })} 
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent" 
                  placeholder="75" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-label">Guru Pengampu (Opsional)</label>
                <select 
                  value={formMapel.guruId} 
                  onChange={(e) => setFormMapel({ ...formMapel, guruId: e.target.value })} 
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                >
                  <option value="" className="bg-bg text-label">-- Tanpa Guru --</option>
                  {guruList.map(g => <option key={g.id} value={g.id} className="bg-bg text-label">{g.nama}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setIsModalMapelOpen(false)} className="h-11 px-5 rounded-full font-semibold text-label hover:bg-fill transition-colors">Batal</button>
                <button 
                  type="submit" disabled={isSubmitting} 
                  className="glass h-11 px-6 rounded-full font-semibold text-white active:scale-95 transition-transform disabled:opacity-50" 
                  style={{ background: 'color-mix(in srgb, #af52de 88%, transparent)' }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="glass glass-thick w-full max-w-md p-6 relative flex flex-col gap-4" 
            style={{ '--glass-radius': 'var(--radius-2xl)' } as React.CSSProperties}
          >
            <div className="flex items-center gap-3 text-[var(--red)]">
              <div className="p-3 rounded-full bg-[color-mix(in_srgb,var(--red)_15%,transparent)]">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-label">
                Hapus {deletingItem.type === 'kelas' ? 'Kelas' : 'Mata Pelajaran'}?
              </h3>
            </div>

            <p className="text-sm text-label-secondary">
              Apakah Anda yakin ingin menghapus <strong>{deletingItem.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>

            {errorMsg && (
              <div className="p-3 rounded-lg text-sm bg-[color-mix(in_srgb,var(--red)_12%,transparent)] text-label">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="h-10 px-5 rounded-full font-semibold text-label hover:bg-fill transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteItem}
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
