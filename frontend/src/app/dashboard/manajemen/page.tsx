// frontend/src/app/dashboard/manajemen/page.tsx
'use client';
import { apiFetch, formatRoleLabel } from "@/lib/api";
import { errorMessage } from '@/lib/errors';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Search, 
  GraduationCap, 
  Users, 
  UserCheck, 
  HeartHandshake, 
  KeyRound, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Copy, 
  Check,
  School,
  BookOpen,
  Calendar,
  Layers,
  Plus,
  Pencil,
  ArrowRight
} from 'lucide-react';
import GlassModal from '@/app/components/GlassModal';

interface UserRecord {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  guru?: {
    id: string;
    nip: string;
    nama: string;
    penugasanMapel: Array<{ mapel: { nama: string }; kelas: { nama: string } }>;
    penugasanWali: Array<{ kelas: { nama: string } }>;
  } | null;
  siswa?: {
    id: string;
    nisn: string;
    nama: string;
    kelas: { id: string; nama: string } | null;
    ortu: { id: string; nama: string; nik: string } | null;
  } | null;
  ortu?: {
    id: string;
    nik: string;
    nama: string;
    anak: Array<{ id: string; nama: string; nisn: string }>;
  } | null;
}

interface GuruOption { id: string; nama: string; nip?: string | null }
interface KelasOption { id: string; nama: string; tingkat: number; waliId?: string | null; wali?: { nama: string } | null }
interface MapelOption { id: string; nama: string; kkm: number; guruId?: string | null; guru?: { nama: string } | null }
interface AcademicYear { id: string; nama: string; aktif: boolean }
interface TeachingAssignment { id: string; guru: GuruOption; mapel: MapelOption; kelas: KelasOption }
interface StudentSummary { id: string; nama: string; nisn: string; kelasId: string | null }

type TabKey = 'users' | 'siswa' | 'guru_mapel' | 'guru_wali' | 'ortu' | 'struktur' | 'penugasan';

export default function ManajemenAkunPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [mapelList, setMapelList] = useState<MapelOption[]>([]);
  const [guruList, setGuruList] = useState<GuruOption[]>([]);
  const [yearList, setYearList] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [newYear, setNewYear] = useState('');
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
  const [studentList, setStudentList] = useState<StudentSummary[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Alert State
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form States Akun
  const [formSiswa, setFormSiswa] = useState({ nisn: '', nama: '', kelasId: '', ortuNik: '', password: '' });
  const [formGuruMapel, setFormGuruMapel] = useState({ nip: '', nama: '', mapelIds: [] as string[], kelasId: '', password: '' });
  const [formGuruWali, setFormGuruWali] = useState({ nip: '', nama: '', kelasId: '', password: '' });
  const [formOrtu, setFormOrtu] = useState({ nik: '', nama: '', siswaNisn: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States Akademik & Penugasan
  const [enrollmentForm, setEnrollmentForm] = useState({ siswaId: '', kelasId: '' });
  const [assignmentForm, setAssignmentForm] = useState({ kelasId: '', mapelId: '', guruId: '' });
  const [homeroomForm, setHomeroomForm] = useState({ kelasId: '', guruId: '' });

  // Modal Kelas & Mapel
  const [isModalKelasOpen, setIsModalKelasOpen] = useState(false);
  const [editingKelasId, setEditingKelasId] = useState<string | null>(null);
  const [formKelas, setFormKelas] = useState({ nama: '', tingkat: '', waliId: '' });

  const [isModalMapelOpen, setIsModalMapelOpen] = useState(false);
  const [editingMapelId, setEditingMapelId] = useState<string | null>(null);
  const [formMapel, setFormMapel] = useState({ nama: '', kkm: '', guruId: '' });

  const [deletingItem, setDeletingItem] = useState<{ type: 'kelas' | 'mapel'; id: string; name: string } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Modal Reset Password & Delete User
  const [resetModalUser, setResetModalUser] = useState<UserRecord | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [deleteModalUser, setDeleteModalUser] = useState<UserRecord | null>(null);

  // Check URL query param ?tab=
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam && ['users', 'siswa', 'guru_mapel', 'guru_wali', 'ortu', 'struktur', 'penugasan'].includes(tabParam)) {
        queueMicrotask(() => {
          setActiveTab(tabParam as TabKey);
        });
      }
    }
  }, []);

  // Load Users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/users');
      if (res.status === 401 || res.status === 403) {
        setIsAuthorized(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      setErrorMsg('Gagal memuat data pengguna dari server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load Academic References
  const fetchAcademicData = useCallback(async () => {
    try {
      const [resKelas, resMapel, resGuru, resYear] = await Promise.all([
        apiFetch(`/api/master/kelas${selectedYear ? `?tahunAjaran=${encodeURIComponent(selectedYear)}` : ''}`),
        apiFetch('/api/master/mapel'),
        apiFetch('/api/master/guru'),
        apiFetch('/api/master/tahun-ajaran')
      ]);

      if (resKelas.ok) setKelasList(await resKelas.json());
      if (resMapel.ok) setMapelList(await resMapel.json());
      if (resGuru.ok) setGuruList(await resGuru.json());
      if (resYear.ok) {
        const years: AcademicYear[] = await resYear.json();
        setYearList(years);
        if (!selectedYear) {
          const activeYear = years.find((y) => y.aktif)?.nama || years[0]?.nama || '';
          setSelectedYear(activeYear);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data referensi master:', err);
    }
  }, [selectedYear]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchUsers();
      void fetchAcademicData();
    });
  }, [fetchUsers, fetchAcademicData]);

  // Load Year Specific Assignments
  useEffect(() => {
    if (!selectedYear) return;
    const loadYearData = async () => {
      const [classRes, assignmentRes, studentRes] = await Promise.all([
        apiFetch(`/api/master/kelas?tahunAjaran=${encodeURIComponent(selectedYear)}`),
        apiFetch(`/api/master/penugasan?tahunAjaran=${encodeURIComponent(selectedYear)}`),
        apiFetch(`/api/master/siswa?tahunAjaran=${encodeURIComponent(selectedYear)}`)
      ]);
      if (classRes.ok) setKelasList(await classRes.json());
      if (studentRes.ok) setStudentList(await studentRes.json());
      if (assignmentRes.ok) {
        const data = await assignmentRes.json();
        setTeachingAssignments(data.kelasMapel || []);
      }
    };
    loadYearData().catch(() => {});
  }, [selectedYear]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Submit Siswa
  const handleRegisterSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await apiFetch('/api/admin/register/siswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formSiswa)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mendaftarkan akun siswa');

      setSuccessMsg(`Akun siswa ${data.data.nama} (NISN: ${data.data.nisn}) berhasil dibuat! Username login: ${data.data.username}`);
      setFormSiswa({ nisn: '', nama: '', kelasId: '', ortuNik: '', password: '' });
      await fetchUsers();
    } catch (err) {
      setErrorMsg(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Guru Mapel
  const handleRegisterGuruMapel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await apiFetch('/api/admin/register/guru-mapel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nip: formGuruMapel.nip,
          nama: formGuruMapel.nama,
          mapelIds: formGuruMapel.mapelIds,
          kelasId: formGuruMapel.kelasId,
          password: formGuruMapel.password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mendaftarkan akun Guru Mapel');

      setSuccessMsg(`Akun Guru Mapel ${data.data.nama} (NIP: ${data.data.nip}) berhasil dibuat! Username login: ${data.data.username}`);
      setFormGuruMapel({ nip: '', nama: '', mapelIds: [], kelasId: '', password: '' });
      await fetchUsers();
      await fetchAcademicData();
    } catch (err) {
      setErrorMsg(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Guru Wali
  const handleRegisterGuruWali = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await apiFetch('/api/admin/register/guru-wali', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nip: formGuruWali.nip,
          nama: formGuruWali.nama,
          kelasId: formGuruWali.kelasId,
          password: formGuruWali.password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mendaftarkan akun Guru Wali');

      setSuccessMsg(`Akun Guru Wali ${data.data.nama} (NIP: ${data.data.nip}) berhasil dibuat dan ditugaskan!`);
      setFormGuruWali({ nip: '', nama: '', kelasId: '', password: '' });
      await fetchUsers();
      await fetchAcademicData();
    } catch (err) {
      setErrorMsg(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Ortu
  const handleRegisterOrtu = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await apiFetch('/api/admin/register/ortu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formOrtu)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mendaftarkan akun Orang Tua');

      setSuccessMsg(`Akun Orang Tua ${data.data.nama} (NIK: ${data.data.nik}) berhasil dibuat!`);
      setFormOrtu({ nik: '', nama: '', siswaNisn: '', password: '' });
      await fetchUsers();
    } catch (err) {
      setErrorMsg(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Password
  const handleResetPassword = async () => {
    if (!resetModalUser || !newPasswordInput) return;
    setErrorMsg('');
    try {
      const res = await apiFetch(`/api/admin/users/${resetModalUser.id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mereset kata sandi');

      setSuccessMsg(`Kata sandi akun ${resetModalUser.email} berhasil direset!`);
      setResetModalUser(null);
      setNewPasswordInput('');
    } catch (err) {
      setErrorMsg(errorMessage(err));
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;
    setErrorMsg('');
    try {
      const res = await apiFetch(`/api/admin/users/${deleteModalUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus pengguna');

      setSuccessMsg(`Akun ${deleteModalUser.email} berhasil dihapus dari sistem!`);
      setDeleteModalUser(null);
      await fetchUsers();
      await fetchAcademicData();
    } catch (err) {
      setErrorMsg(errorMessage(err));
    }
  };

  // Handlers Akademik
  const createAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await apiFetch('/api/master/tahun-ajaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: newYear })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal membuat tahun ajaran.');
      setNewYear('');
      setSelectedYear(data.data.nama);
      await fetchAcademicData();
      setSuccessMsg('Tahun ajaran berhasil dibuat! Silakan aktifkan jika merupakan tahun berjalan.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Gagal membuat tahun ajaran.');
    }
  };

  const activateAcademicYear = async () => {
    const year = yearList.find((item) => item.nama === selectedYear);
    if (!year) return;
    const response = await apiFetch(`/api/master/tahun-ajaran/${year.id}/aktif`, { method: 'PUT' });
    if (!response.ok) { setErrorMsg('Gagal mengaktifkan tahun ajaran.'); return; }
    await fetchAcademicData();
    setSuccessMsg(`${year.nama} ditetapkan sebagai tahun ajaran aktif.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const saveTeachingAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await apiFetch('/api/master/penugasan/mapel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...assignmentForm, tahunAjaran: selectedYear })
    });
    const data = await response.json();
    if (!response.ok) { setErrorMsg(data.error || 'Gagal menyimpan penugasan mapel.'); return; }
    setSuccessMsg('Penugasan guru mata pelajaran berhasil disimpan.');
    setTimeout(() => setSuccessMsg(''), 3000);
    setAssignmentForm((prev) => ({ ...prev, mapelId: '', guruId: '' }));
    const resp = await apiFetch(`/api/master/penugasan?tahunAjaran=${encodeURIComponent(selectedYear)}`);
    if (resp.ok) setTeachingAssignments((await resp.json()).kelasMapel || []);
  };

  const saveHomeroomAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await apiFetch('/api/master/penugasan/wali', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...homeroomForm, tahunAjaran: selectedYear })
    });
    const data = await response.json();
    if (!response.ok) { setErrorMsg(data.error || 'Gagal menyimpan wali kelas.'); return; }
    setSuccessMsg('Penugasan wali kelas berhasil disimpan.');
    setTimeout(() => setSuccessMsg(''), 3000);
    setHomeroomForm({ kelasId: '', guruId: '' });
    fetchAcademicData();
  };

  const saveStudentEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await apiFetch(`/api/master/siswa/${enrollmentForm.siswaId}/kelas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kelasId: enrollmentForm.kelasId, tahunAjaran: selectedYear })
    });
    const data = await response.json();
    if (!response.ok) { setErrorMsg(data.error || 'Gagal menyimpan riwayat kelas siswa.'); return; }
    setSuccessMsg(`Riwayat kelas siswa pada tahun ajaran ${selectedYear} berhasil disimpan.`);
    setTimeout(() => setSuccessMsg(''), 3000);
    const responseList = await apiFetch(`/api/master/siswa?tahunAjaran=${encodeURIComponent(selectedYear)}`);
    if (responseList.ok) setStudentList(await responseList.json());
    setEnrollmentForm({ siswaId: '', kelasId: '' });
  };

  const handleSubmitKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const url = editingKelasId ? `/api/master/kelas/${editingKelasId}` : '/api/master/kelas';
      const method = editingKelasId ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formKelas, tahunAjaran: selectedYear })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses kelas');

      setIsModalKelasOpen(false);
      setFormKelas({ nama: '', tingkat: '', waliId: '' });
      setSuccessMsg(editingKelasId ? 'Kelas berhasil diperbarui!' : 'Kelas baru berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchAcademicData();
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal menyimpan kelas.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitMapel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const url = editingMapelId ? `/api/master/mapel/${editingMapelId}` : '/api/master/mapel';
      const method = editingMapelId ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formMapel)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses mapel');

      setIsModalMapelOpen(false);
      setFormMapel({ nama: '', kkm: '', guruId: '' });
      setSuccessMsg(editingMapelId ? 'Mata pelajaran berhasil diperbarui!' : 'Mata pelajaran baru berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchAcademicData();
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal menyimpan mata pelajaran.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    setIsDeletingItem(true);
    setErrorMsg('');
    try {
      const url = `/api/master/${deletingItem.type}/${deletingItem.id}`;
      const res = await apiFetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Gagal menghapus ${deletingItem.type}`);

      setDeletingItem(null);
      setSuccessMsg(`Data ${deletingItem.type === 'kelas' ? 'kelas' : 'mata pelajaran'} berhasil dihapus!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchAcademicData();
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Gagal menghapus data akademik.'));
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchNama = (u.siswa?.nama || u.guru?.nama || u.ortu?.nama || '').toLowerCase().includes(q);
      const matchId = (u.siswa?.nisn || u.guru?.nip || u.ortu?.nik || '').toLowerCase().includes(q);
      return matchEmail || matchNama || matchId;
    });
  }, [users, roleFilter, searchQuery]);

  // Setup Checklist Calculation
  const setupIssues = useMemo(() => {
    const issues: Array<{ text: string; tab: TabKey; actionLabel: string }> = [];
    const hasActiveYear = yearList.some((y) => y.aktif);
    if (!hasActiveYear && yearList.length > 0) {
      issues.push({
        text: 'Belum ada tahun ajaran yang ditetapkan sebagai Aktif.',
        tab: 'penugasan',
        actionLabel: 'Atur Tahun Aktif'
      });
    }
    const unassignedHomeroom = kelasList.filter((k) => !k.waliId && !k.wali);
    if (unassignedHomeroom.length > 0) {
      issues.push({
        text: `${unassignedHomeroom.length} kelas belum memiliki Wali Kelas (${unassignedHomeroom.map((k) => k.nama).slice(0, 3).join(', ')}${unassignedHomeroom.length > 3 ? '...' : ''}).`,
        tab: 'penugasan',
        actionLabel: 'Tugaskan Wali'
      });
    }
    const unassignedMapel = mapelList.filter((m) => !m.guruId && !m.guru);
    if (unassignedMapel.length > 0) {
      issues.push({
        text: `${unassignedMapel.length} mata pelajaran belum memiliki Koordinator Guru Pengampu.`,
        tab: 'struktur',
        actionLabel: 'Atur Guru Mapel'
      });
    }
    return issues;
  }, [yearList, kelasList, mapelList]);

  // Role Statistics
  const roleStats = useMemo(() => {
    const counts: Record<string, number> = { ALL: users.length, SISWA: 0, GURU_MAPEL: 0, GURU_WALI: 0, ORTU: 0, ADMIN: 0 };
    for (const u of users) {
      counts[u.role] = (counts[u.role] || 0) + 1;
    }
    return counts;
  }, [users]);

  const currentYearObj = yearList.find((y) => y.nama === selectedYear);

  if (!isAuthorized) {
    return (
      <div className="bg-card rounded-xl border border-separator p-8 text-center flex flex-col items-center gap-3">
        <ShieldCheck size={36} className="text-red-500" />
        <h2 className="text-lg font-bold text-label">Akses Terbatas</h2>
        <p className="text-xs text-label-secondary">
          Halaman manajemen akun dan konfigurasi sistem hanya dapat diakses oleh Administrator.
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
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Portal Master Administrator</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label">
            Manajemen Akun, Struktur & Penugasan
          </h1>
          <p className="text-sm text-label-secondary mt-1">
            Satu pusat pengelolaan terpadu untuk kredensial pengguna, struktur kelas, kurikulum, dan tahun ajaran aktif.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { void fetchUsers(); void fetchAcademicData(); }}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-separator bg-bg hover:bg-card-subtle text-label text-xs font-medium transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Setup Checklist Banner (Tampil hanya jika ada issue konfigurasi) */}
      {setupIssues.length > 0 && (
        <div className="p-4 sm:p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Perhatian Konfigurasi Sistem ({setupIssues.length} hal perlu dituntaskan):</span>
          </div>
          <div className="flex flex-col gap-2">
            {setupIssues.map((issue, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-card/60 border border-amber-500/20 text-xs">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed text-label">{issue.text}</span>
                </div>
                <button
                  onClick={() => setActiveTab(issue.tab)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-colors self-end sm:self-auto cursor-pointer"
                >
                  <span>{issue.actionLabel}</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-sm flex items-start justify-between gap-3 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <span className="font-medium leading-relaxed">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-emerald-500/20 rounded-md transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {errorMsg && !isModalKelasOpen && !isModalMapelOpen && !deletingItem && (
        <div className="p-4 rounded-xl bg-[var(--status-fail-bg)] border border-red-500/30 text-[var(--status-fail)] text-sm flex items-start justify-between gap-3 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="p-1 hover:bg-red-500/20 rounded-md transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Navigation Tabs Terpadu */}
      <div className="flex items-center gap-2 border-b border-separator/80 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-card hover:bg-card-subtle border border-separator text-label-secondary hover:text-label'
          }`}
        >
          <ShieldCheck size={15} />
          <span>Daftar Pengguna</span>
          <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-black/15 font-mono">{roleStats.ALL}</span>
        </button>

        <button
          onClick={() => setActiveTab('struktur')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'struktur'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-card hover:bg-card-subtle border border-separator text-label-secondary hover:text-label'
          }`}
        >
          <Layers size={15} />
          <span>Kelas & Mata Pelajaran</span>
        </button>

        <button
          onClick={() => setActiveTab('penugasan')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'penugasan'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-card hover:bg-card-subtle border border-separator text-label-secondary hover:text-label'
          }`}
        >
          <Calendar size={15} />
          <span>Tahun Ajaran & Penugasan</span>
        </button>

        <button
          onClick={() => setActiveTab('siswa')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'siswa'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-card hover:bg-card-subtle border border-separator text-label-secondary hover:text-label'
          }`}
        >
          <GraduationCap size={15} />
          <span>Registrasi Siswa</span>
        </button>

        <button
          onClick={() => setActiveTab('guru_mapel')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'guru_mapel'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-card hover:bg-card-subtle border border-separator text-label-secondary hover:text-label'
          }`}
        >
          <Users size={15} />
          <span>Guru Mapel (NIP)</span>
        </button>

        <button
          onClick={() => setActiveTab('guru_wali')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'guru_wali'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-card hover:bg-card-subtle border border-separator text-label-secondary hover:text-label'
          }`}
        >
          <UserCheck size={15} />
          <span>Guru Wali (NIP)</span>
        </button>

        <button
          onClick={() => setActiveTab('ortu')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'ortu'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-card hover:bg-card-subtle border border-separator text-label-secondary hover:text-label'
          }`}
        >
          <HeartHandshake size={15} />
          <span>Orang Tua (NIK)</span>
        </button>
      </div>

      {/* ================= TAB 1: DAFTAR PENGGUNA ================= */}
      {activeTab === 'users' && (
        <div className="flex flex-col gap-4">
          
          {/* Filter & Search Bar */}
          <div className="bg-card rounded-xl border border-separator p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
              {(['ALL', 'SISWA', 'GURU_MAPEL', 'GURU_WALI', 'ORTU', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    roleFilter === r
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-fill hover:bg-card-subtle border border-separator text-label-secondary hover:text-label'
                  }`}
                >
                  {r === 'ALL' ? 'Semua Akun' : formatRoleLabel(r)} ({roleStats[r] ?? 0})
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary" />
              <input
                type="text"
                placeholder="Cari nama, NISN/NIP/NIK, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-separator bg-bg text-sm text-label placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-card rounded-xl border border-separator shadow-sm overflow-hidden">
            <div className="sm:hidden px-4 py-1.5 text-[10px] text-label-tertiary italic text-right border-b border-separator/40">
              Geser tabel ke samping untuk melihat data lengkap &rarr;
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-fill/60 text-label-secondary border-b border-separator text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Nama Lengkap & Identitas</th>
                    <th className="py-3 px-4">Role Akses</th>
                    <th className="py-3 px-4">Username / ID Unik</th>
                    <th className="py-3 px-4">Penugasan / Hubungan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-separator/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-label-secondary">
                        Tidak ada akun pengguna yang cocok dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const profileName = u.siswa?.nama || u.guru?.nama || u.ortu?.nama || 'Administrator';
                      const profileId = u.siswa?.nisn || u.guru?.nip || u.ortu?.nik || u.email;
                      const idLabel = u.siswa ? 'NISN' : u.guru ? 'NIP' : u.ortu ? 'NIK' : 'Email';

                      return (
                        <tr key={u.id} className="hover:bg-card-subtle/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-label">{profileName}</div>
                            <div className="text-xs text-label-tertiary font-mono">{u.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-subtle border border-primary-border text-primary">
                              {formatRoleLabel(u.role)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-medium bg-fill px-2 py-0.5 rounded border border-separator/60 text-label">
                                {profileId}
                              </span>
                              <button
                                onClick={() => handleCopy(profileId, u.id)}
                                title={`Salin ${idLabel}`}
                                className="p-1 hover:bg-fill rounded text-label-tertiary hover:text-label transition-colors cursor-pointer"
                              >
                                {copiedId === u.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                              </button>
                            </div>
                            <span className="text-[10px] text-label-tertiary">{idLabel} Resmi</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-label-secondary">
                            {u.siswa && (
                              <span>Kelas: <strong className="text-label">{u.siswa.kelas?.nama || 'Belum ada'}</strong></span>
                            )}
                            {u.guru && u.guru.penugasanWali && u.guru.penugasanWali.length > 0 && (
                              <span>Wali Kelas: <strong className="text-label">{u.guru.penugasanWali[0]?.kelas.nama}</strong></span>
                            )}
                            {u.guru && u.guru.penugasanMapel && u.guru.penugasanMapel.length > 0 && (
                              <span>{u.guru.penugasanMapel.length} Mapel Diampu</span>
                            )}
                            {u.ortu && (
                              <span>Anak: <strong className="text-label">{u.ortu.anak?.map((a) => a.nama).join(', ') || 'Belum dihubungkan'}</strong></span>
                            )}
                            {u.role === 'ADMIN' && <span className="text-label-tertiary">Hak Akses Penuh Sistem</span>}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => { setResetModalUser(u); setNewPasswordInput(''); }}
                                title="Reset Kata Sandi"
                                className="p-1.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle text-label-secondary hover:text-label transition-colors cursor-pointer"
                              >
                                <KeyRound size={15} />
                              </button>
                              {u.role !== 'ADMIN' && (
                                <button
                                  onClick={() => setDeleteModalUser(u)}
                                  title="Hapus Pengguna"
                                  className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-[var(--status-fail)] transition-colors cursor-pointer"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
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
        </div>
      )}

      {/* ================= TAB 2: STRUKTUR (KELAS & MAPEL) ================= */}
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
                  <h2 className="font-serif font-bold text-base text-label">Daftar Kelas</h2>
                  <p className="text-[11px] text-label-secondary">Tingkat 7, 8, dan 9 SMP Al-Hidayah</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setEditingKelasId(null);
                  setFormKelas({ nama: '', tingkat: '', waliId: '' });
                  setIsModalKelasOpen(true);
                }} 
                className="h-8.5 px-3 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus size={15} /> <span>Tambah Kelas</span>
              </button>
            </div>
            
            <section className="bg-card rounded-2xl border border-separator/60 shadow-xs overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-separator/40 bg-fill/40">
                      <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">NAMA KELAS</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">WALI KELAS</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider text-right w-20">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-label divide-y divide-separator/40">
                    {kelasList.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-label-secondary">
                          Belum ada data kelas terdaftar.
                        </td>
                      </tr>
                    ) : (
                      kelasList.map((k) => (
                        <tr key={k.id} className="hover:bg-card-subtle/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-label">
                            {k.nama} <span className="text-[10px] text-label-tertiary font-normal">(Tingkat {k.tingkat})</span>
                          </td>
                          <td className="px-4 py-3">
                            {k.wali?.nama ? (
                              <span className="font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px]">
                                {k.wali.nama}
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded text-[11px]">
                                Belum ada wali
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => {
                                  setEditingKelasId(k.id);
                                  setFormKelas({ nama: k.nama, tingkat: String(k.tingkat), waliId: k.waliId || '' });
                                  setIsModalKelasOpen(true);
                                }} 
                                className="p-1.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle text-label-secondary transition-colors cursor-pointer"
                                title="Edit Kelas"
                              >
                                <Pencil size={13} />
                              </button>
                              <button 
                                onClick={() => setDeletingItem({ type: 'kelas', id: k.id, name: k.nama })} 
                                className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-[var(--status-fail)] transition-colors cursor-pointer"
                                title="Hapus Kelas"
                              >
                                <Trash2 size={13} />
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
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/50">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base text-label">Mata Pelajaran</h2>
                  <p className="text-[11px] text-label-secondary">Kurikulum dan Ambang Batas KKM</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setEditingMapelId(null);
                  setFormMapel({ nama: '', kkm: '75', guruId: '' });
                  setIsModalMapelOpen(true);
                }} 
                className="h-8.5 px-3 rounded-lg text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 active:scale-95 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus size={15} /> <span>Tambah Mapel</span>
              </button>
            </div>
            
            <section className="bg-card rounded-2xl border border-separator/60 shadow-xs overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-separator/40 bg-fill/40">
                      <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">MATA PELAJARAN</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">KKM</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider">KOORDINATOR</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-label-secondary uppercase tracking-wider text-right w-20">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-label divide-y divide-separator/40">
                    {mapelList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-label-secondary">
                          Belum ada mata pelajaran terdaftar.
                        </td>
                      </tr>
                    ) : (
                      mapelList.map((m) => (
                        <tr key={m.id} className="hover:bg-card-subtle/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-label">{m.nama}</td>
                          <td className="px-4 py-3 font-mono font-medium">{m.kkm}</td>
                          <td className="px-4 py-3 text-label-secondary">
                            {m.guru?.nama ? (
                              <span className="text-emerald-800 dark:text-emerald-300 font-medium">{m.guru.nama}</span>
                            ) : (
                              <span className="text-label-tertiary italic">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => {
                                  setEditingMapelId(m.id);
                                  setFormMapel({ nama: m.nama, kkm: String(m.kkm), guruId: m.guruId || '' });
                                  setIsModalMapelOpen(true);
                                }} 
                                className="p-1.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle text-label-secondary transition-colors cursor-pointer"
                                title="Edit Mapel"
                              >
                                <Pencil size={13} />
                              </button>
                              <button 
                                onClick={() => setDeletingItem({ type: 'mapel', id: m.id, name: m.nama })} 
                                className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-[var(--status-fail)] transition-colors cursor-pointer"
                                title="Hapus Mapel"
                              >
                                <Trash2 size={13} />
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
      )}

      {/* ================= TAB 3: PENUGASAN (TAHUN AJARAN & MATRIKS) ================= */}
      {activeTab === 'penugasan' && (
        <div className="flex flex-col gap-6">
          {/* Card Tahun Ajaran Aktif */}
          <section className="bg-card rounded-2xl border border-separator/60 p-5 shadow-xs flex flex-col gap-4">
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

                {selectedYear && !currentYearObj?.aktif && (
                  <button 
                    onClick={activateAcademicYear} 
                    className="h-9 px-3.5 rounded-xl border border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Jadikan Tahun Aktif
                  </button>
                )}

                <form onSubmit={createAcademicYear} className="flex items-center gap-2">
                  <input 
                    value={newYear} 
                    onChange={(e) => setNewYear(e.target.value)} 
                    placeholder="2026/2027" 
                    pattern="[0-9]{4}/[0-9]{4}" 
                    required 
                    className="h-9 w-28 px-3 rounded-xl bg-fill text-label text-xs font-mono border border-separator/40 focus:outline-none focus:ring-2 focus:ring-emerald-700/50" 
                  />
                  <button className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all shadow-xs cursor-pointer">
                    Tambah Tahun
                  </button>
                </form>
              </div>
            </div>

            {/* Matriks Penugasan 3 Formulir Terpadu */}
            {selectedYear && (
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
                      <option value="">Pilih Mata Pelajaran</option>
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
                  <button className="h-9 mt-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-all cursor-pointer">
                    Simpan Penugasan Mapel
                  </button>
                </form>

                {/* 2. Wali Kelas */}
                <form onSubmit={saveHomeroomAssignment} className="p-4 rounded-xl bg-fill/30 border border-separator/40 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-emerald-700" />
                    <h3 className="font-serif font-bold text-xs text-label">Penetapan Wali Kelas</h3>
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-label-secondary">Kelas</label>
                    <select required value={homeroomForm.kelasId} onChange={(e) => setHomeroomForm({ ...homeroomForm, kelasId: e.target.value })} className="h-9 w-full px-2.5 rounded-lg bg-bg text-xs border border-separator/40">
                      <option value="">Pilih Kelas</option>
                      {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-label-secondary">Guru Wali Kelas</label>
                    <select required value={homeroomForm.guruId} onChange={(e) => setHomeroomForm({ ...homeroomForm, guruId: e.target.value })} className="h-9 w-full px-2.5 rounded-lg bg-bg text-xs border border-separator/40">
                      <option value="">Pilih Guru Wali</option>
                      {guruList.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
                    </select>
                  </div>
                  <p className="text-[11px] text-label-tertiary leading-relaxed mt-auto">
                    Wali kelas bertanggung jawab merekap nilai rapor, mencatat presensi, dan mencetak lembar rapor resmi siswa.
                  </p>
                  <button className="h-9 mt-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer">
                    Simpan Wali Kelas
                  </button>
                </form>

                {/* 3. Penempatan Kelas Siswa */}
                <form onSubmit={saveStudentEnrollment} className="p-4 rounded-xl bg-fill/30 border border-separator/40 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={16} className="text-primary" />
                    <h3 className="font-serif font-bold text-xs text-label">Penempatan Kelas Siswa</h3>
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-label-secondary">Siswa</label>
                    <select required value={enrollmentForm.siswaId} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, siswaId: e.target.value })} className="h-9 w-full px-2.5 rounded-lg bg-bg text-xs border border-separator/40">
                      <option value="">Pilih Siswa</option>
                      {studentList.map((s) => <option key={s.id} value={s.id}>{s.nama} ({s.nisn})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-label-secondary">Kelas Tujuan ({selectedYear})</label>
                    <select required value={enrollmentForm.kelasId} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, kelasId: e.target.value })} className="h-9 w-full px-2.5 rounded-lg bg-bg text-xs border border-separator/40">
                      <option value="">Pilih Kelas</option>
                      {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </select>
                  </div>
                  <p className="text-[11px] text-label-tertiary leading-relaxed mt-auto">
                    Penempatan kelas per tahun ajaran menjaga arsip historis nilai siswa tidak terhapus pada tahun berikutnya.
                  </p>
                  <button className="h-9 mt-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-all cursor-pointer">
                    Tempatkan Siswa
                  </button>
                </form>
              </div>
            )}
          </section>

          {/* Tabel Penugasan Aktif */}
          <section className="bg-card rounded-2xl border border-separator/60 p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-separator/40">
              <h3 className="font-serif font-bold text-sm text-label">
                Matriks Penugasan Guru Mapel ({selectedYear})
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-fill text-label-secondary font-semibold tabular-nums border border-separator/30">
                {teachingAssignments.length} penugasan
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-separator/40 bg-fill/40 text-[11px] font-bold text-label-secondary uppercase tracking-wider">
                    <th className="px-4 py-2.5">KELAS</th>
                    <th className="px-4 py-2.5">MATA PELAJARAN</th>
                    <th className="px-4 py-2.5">GURU PENGAMPU</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-label divide-y divide-separator/40">
                  {teachingAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-label-secondary">
                        Belum ada penugasan guru mapel pada tahun ajaran ini.
                      </td>
                    </tr>
                  ) : (
                    teachingAssignments.map((t) => (
                      <tr key={t.id} className="hover:bg-card-subtle/50 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-label">{t.kelas?.nama}</td>
                        <td className="px-4 py-2.5">{t.mapel?.nama}</td>
                        <td className="px-4 py-2.5 font-medium text-emerald-800 dark:text-emerald-300">
                          {t.guru?.nama}
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

      {/* ================= TAB 4: DAFTAR SISWA ================= */}
      {activeTab === 'siswa' && (
        <div className="bg-card rounded-xl border border-separator p-6 shadow-sm max-w-2xl">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-separator">
            <div className="w-10 h-10 rounded-xl bg-primary-subtle border border-primary-border text-primary flex items-center justify-center shrink-0">
              <GraduationCap size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-label">Registrasi Akun Siswa Baru</h2>
              <p className="text-xs text-label-secondary">Username login otomatis menggunakan NISN 10 digit angka resmi.</p>
            </div>
          </div>

          <form onSubmit={handleRegisterSiswa} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                NISN (10 Digit Angka) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="Contoh: 0081234567"
                value={formSiswa.nisn}
                onChange={(e) => setFormSiswa({ ...formSiswa, nisn: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Nama Lengkap Siswa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Muhammad Farhan"
                value={formSiswa.nama}
                onChange={(e) => setFormSiswa({ ...formSiswa, nama: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Kelas Awal (Opsional)
              </label>
              <select
                value={formSiswa.kelasId}
                onChange={(e) => setFormSiswa({ ...formSiswa, kelasId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
              >
                <option value="">-- Tanpa Penempatan Awal --</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>Kelas {k.nama} (Tingkat {k.tingkat})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Tautkan NIK Orang Tua (Opsional)
              </label>
              <input
                type="text"
                maxLength={16}
                placeholder="16 digit NIK akun orang tua terdaftar"
                value={formSiswa.ortuNik}
                onChange={(e) => setFormSiswa({ ...formSiswa, ortuNik: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Kata Sandi Awal <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={formSiswa.password}
                onChange={(e) => setFormSiswa({ ...formSiswa, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <UserPlus size={16} />
                <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Akun Siswa'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 5: GURU MAPEL ================= */}
      {activeTab === 'guru_mapel' && (
        <div className="bg-card rounded-xl border border-separator p-6 shadow-sm max-w-2xl">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-separator">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-label">Registrasi Akun Guru Mata Pelajaran</h2>
              <p className="text-xs text-label-secondary">Username login menggunakan NIP resmi 18 digit.</p>
            </div>
          </div>

          <form onSubmit={handleRegisterGuruMapel} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                NIP Guru (18 Digit Angka) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={18}
                placeholder="Contoh: 198501152010011002"
                value={formGuruMapel.nip}
                onChange={(e) => setFormGuruMapel({ ...formGuruMapel, nip: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Nama Lengkap Guru (beserta gelar) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Drs. Bambang Irawan, M.Pd."
                value={formGuruMapel.nama}
                onChange={(e) => setFormGuruMapel({ ...formGuruMapel, nama: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Mata Pelajaran yang Diampu (Pilih satu atau lebih)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border border-separator rounded-lg bg-bg">
                {mapelList.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-xs text-label cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formGuruMapel.mapelIds.includes(m.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormGuruMapel({ ...formGuruMapel, mapelIds: [...formGuruMapel.mapelIds, m.id] });
                        } else {
                          setFormGuruMapel({ ...formGuruMapel, mapelIds: formGuruMapel.mapelIds.filter((id) => id !== m.id) });
                        }
                      }}
                      className="rounded border-separator text-primary focus:ring-primary"
                    />
                    <span>{m.nama} (KKM {m.kkm})</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Kata Sandi Akun <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={formGuruMapel.password}
                onChange={(e) => setFormGuruMapel({ ...formGuruMapel, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <UserPlus size={16} />
                <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Akun Guru Mapel'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 6: GURU WALI ================= */}
      {activeTab === 'guru_wali' && (
        <div className="bg-card rounded-xl border border-separator p-6 shadow-sm max-w-2xl">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-separator">
            <div className="w-10 h-10 rounded-xl bg-primary-subtle border border-primary-border text-primary flex items-center justify-center shrink-0">
              <UserCheck size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-label">Registrasi Akun Guru Wali Kelas</h2>
              <p className="text-xs text-label-secondary">Guru Wali memiliki akses rekapitulasi nilai kumulatif, presensi, catatan sikap, dan cetak rapor.</p>
            </div>
          </div>

          <form onSubmit={handleRegisterGuruWali} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                NIP Guru Wali (18 Digit Angka) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={18}
                placeholder="Contoh: 198002142008012005"
                value={formGuruWali.nip}
                onChange={(e) => setFormGuruWali({ ...formGuruWali, nip: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Nama Lengkap Guru (beserta gelar) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Hj. Siti Nurhaliza, S.Pd."
                value={formGuruWali.nama}
                onChange={(e) => setFormGuruWali({ ...formGuruWali, nama: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Kelas Binaan yang Ditugaskan
              </label>
              <select
                value={formGuruWali.kelasId}
                onChange={(e) => setFormGuruWali({ ...formGuruWali, kelasId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
              >
                <option value="">-- Belum Menugaskan Kelas --</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>Kelas {k.nama} (Tingkat {k.tingkat})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Kata Sandi Akun <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={formGuruWali.password}
                onChange={(e) => setFormGuruWali({ ...formGuruWali, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <UserPlus size={16} />
                <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Akun Guru Wali'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 7: ORTU ================= */}
      {activeTab === 'ortu' && (
        <div className="bg-card rounded-xl border border-separator p-6 shadow-sm max-w-2xl">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-separator">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0">
              <HeartHandshake size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-label">Registrasi Akun Orang Tua</h2>
              <p className="text-xs text-label-secondary">Username login menggunakan NIK KTP 16 digit.</p>
            </div>
          </div>

          <form onSubmit={handleRegisterOrtu} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                NIK KTP (16 Digit Angka) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={16}
                placeholder="Contoh: 1271012345670001"
                value={formOrtu.nik}
                onChange={(e) => setFormOrtu({ ...formOrtu, nik: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Nama Lengkap Orang Tua / Wali <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Hendra Pratama"
                value={formOrtu.nama}
                onChange={(e) => setFormOrtu({ ...formOrtu, nama: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Hubungkan NISN Siswa (Anak)
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="Masukkan 10 digit NISN anak yang sudah terdaftar"
                value={formOrtu.siswaNisn}
                onChange={(e) => setFormOrtu({ ...formOrtu, siswaNisn: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Kata Sandi Akun <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={formOrtu.password}
                onChange={(e) => setFormOrtu({ ...formOrtu, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <UserPlus size={16} />
                <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Akun Orang Tua'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL KELAS ================= */}
      {isModalKelasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-separator rounded-2xl shadow-xl p-6 relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-separator">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                  <School size={18} />
                </div>
                <h3 className="font-serif font-bold text-base text-label">
                  {editingKelasId ? 'Perbarui Kelas' : 'Tambah Kelas Baru'}
                </h3>
              </div>
              <button onClick={() => setIsModalKelasOpen(false)} className="p-1 rounded-lg hover:bg-fill text-label-secondary cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitKelas} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Nama Kelas</label>
                <input 
                  type="text" required value={formKelas.nama} 
                  onChange={(e) => setFormKelas({ ...formKelas, nama: e.target.value })} 
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  placeholder="Contoh: VII-A, VIII-B" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Tingkat Jenjang (7, 8, atau 9)</label>
                <select 
                  required value={formKelas.tingkat} 
                  onChange={(e) => setFormKelas({ ...formKelas, tingkat: e.target.value })} 
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="">Pilih Tingkat Jenjang</option>
                  <option value="7">Tingkat 7 (Kelas VII)</option>
                  <option value="8">Tingkat 8 (Kelas VIII)</option>
                  <option value="9">Tingkat 9 (Kelas IX)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Guru Wali Kelas (Opsional)</label>
                <select 
                  value={formKelas.waliId} 
                  onChange={(e) => setFormKelas({ ...formKelas, waliId: e.target.value })} 
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="">-- Belum Ditentukan --</option>
                  {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-separator mt-1">
                <button 
                  type="button" 
                  onClick={() => setIsModalKelasOpen(false)} 
                  className="h-10 px-4 rounded-xl text-xs font-semibold text-label hover:bg-fill transition-colors border border-separator cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" disabled={isSubmitting} 
                  className="h-10 px-5 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : editingKelasId ? 'Simpan Perubahan' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL MAPEL ================= */}
      {isModalMapelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-separator rounded-2xl shadow-xl p-6 relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-separator">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                  <BookOpen size={18} />
                </div>
                <h3 className="font-serif font-bold text-base text-label">
                  {editingMapelId ? 'Perbarui Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                </h3>
              </div>
              <button onClick={() => setIsModalMapelOpen(false)} className="p-1 rounded-lg hover:bg-fill text-label-secondary cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitMapel} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Nama Mata Pelajaran</label>
                <input 
                  type="text" required value={formMapel.nama} 
                  onChange={(e) => setFormMapel({ ...formMapel, nama: e.target.value })} 
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator focus:outline-none focus:ring-2 focus:ring-amber-600/50" 
                  placeholder="Contoh: Matematika, Bahasa Indonesia" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Batas Ambang KKM (Skala 0 - 100)</label>
                <input 
                  type="number" required value={formMapel.kkm} 
                  onChange={(e) => setFormMapel({ ...formMapel, kkm: e.target.value })} 
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm font-mono border border-separator focus:outline-none focus:ring-2 focus:ring-amber-600/50" 
                  placeholder="75" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Guru Koordinator Pengampu (Opsional)</label>
                <select 
                  value={formMapel.guruId} 
                  onChange={(e) => setFormMapel({ ...formMapel, guruId: e.target.value })} 
                  className="h-10 px-3 rounded-xl bg-fill text-label text-sm border border-separator focus:outline-none focus:ring-2 focus:ring-amber-600/50 cursor-pointer"
                >
                  <option value="">-- Tanpa Guru Koordinator --</option>
                  {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-separator mt-1">
                <button 
                  type="button" 
                  onClick={() => setIsModalMapelOpen(false)} 
                  className="h-10 px-4 rounded-xl text-xs font-semibold text-label hover:bg-fill transition-colors border border-separator cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" disabled={isSubmitting} 
                  className="h-10 px-5 rounded-xl text-xs font-semibold text-white bg-amber-700 hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : editingMapelId ? 'Simpan Perubahan' : 'Simpan Mapel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL KONFIRMASI HAPUS KELAS / MAPEL ================= */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-separator rounded-2xl shadow-xl p-6 relative flex flex-col gap-4">
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

            <div className="flex justify-end gap-2.5 pt-2 border-t border-separator">
              <button
                onClick={() => setDeletingItem(null)}
                disabled={isDeletingItem}
                className="h-10 px-4 rounded-xl text-xs font-semibold text-label hover:bg-fill transition-colors border border-separator cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteItem}
                disabled={isDeletingItem}
                className="h-10 px-5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDeletingItem ? (
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

      {/* ================= MODAL RESET PASSWORD ================= */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-separator rounded-2xl w-full max-w-md p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-separator">
              <div className="flex items-center gap-2">
                <KeyRound size={20} className="text-primary" />
                <h3 className="font-bold text-label text-base">Reset Kata Sandi Pengguna</h3>
              </div>
              <button onClick={() => setResetModalUser(null)} className="p-1 rounded-lg hover:bg-fill text-label-secondary cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="text-sm text-label-secondary">
              Atur kata sandi baru untuk akun:
              <div className="font-semibold text-label mt-1">{resetModalUser.email}</div>
              <div className="text-xs text-label-tertiary">Role: {formatRoleLabel(resetModalUser.role)}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">Kata Sandi Baru</label>
              <input
                type="password"
                minLength={6}
                placeholder="Masukkan minimal 6 karakter"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-separator">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="px-4 py-2 rounded-lg border border-separator bg-bg hover:bg-card-subtle text-label text-sm font-medium transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={newPasswordInput.length < 6}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                Simpan Kata Sandi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DELETE CONFIRMATION ================= */}
      <GlassModal
        isOpen={!!deleteModalUser}
        type="confirm"
        title="Hapus Akun Pengguna"
        description={`Apakah Anda yakin ingin menghapus akun ${deleteModalUser?.email} (${formatRoleLabel(deleteModalUser?.role)})? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Akun"
        cancelLabel="Batal"
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteModalUser(null)}
      />

    </div>
  );
}
