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
  Check
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

interface KelasOption { id: string; nama: string; tingkat: number }
interface MapelOption { id: string; nama: string }

export default function ManajemenAkunPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'siswa' | 'guru_mapel' | 'guru_wali' | 'ortu'>('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [mapelList, setMapelList] = useState<MapelOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Alert State
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form States
  const [formSiswa, setFormSiswa] = useState({ nisn: '', nama: '', kelasId: '', ortuNik: '', password: '' });
  const [formGuruMapel, setFormGuruMapel] = useState({ nip: '', nama: '', mapelIds: [] as string[], kelasId: '', password: '' });
  const [formGuruWali, setFormGuruWali] = useState({ nip: '', nama: '', kelasId: '', password: '' });
  const [formOrtu, setFormOrtu] = useState({ nik: '', nama: '', siswaNisn: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal States
  const [resetModalUser, setResetModalUser] = useState<UserRecord | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [deleteModalUser, setDeleteModalUser] = useState<UserRecord | null>(null);

  // Load Users & Academic References
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

  const fetchReferences = useCallback(async () => {
    try {
      const [resKelas, resMapel] = await Promise.all([
        apiFetch('/api/master/kelas'),
        apiFetch('/api/master/mapel')
      ]);
      if (resKelas.ok) setKelasList(await resKelas.json());
      if (resMapel.ok) setMapelList(await resMapel.json());
    } catch (err) {
      console.error('Gagal mengambil data referensi master:', err);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchUsers();
      void fetchReferences();
    });
  }, [fetchUsers, fetchReferences]);

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
        body: JSON.stringify(formGuruMapel)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mendaftarkan guru mapel');

      setSuccessMsg(`Akun Guru Mapel ${data.data.nama} (NIP: ${data.data.nip}) berhasil dibuat! Username login: ${data.data.username}`);
      setFormGuruMapel({ nip: '', nama: '', mapelIds: [], kelasId: '', password: '' });
      await fetchUsers();
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
        body: JSON.stringify(formGuruWali)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mendaftarkan wali kelas');

      setSuccessMsg(`Akun Guru Wali Kelas ${data.data.nama} (NIP: ${data.data.nip}) berhasil dibuat! Username login: ${data.data.username}`);
      setFormGuruWali({ nip: '', nama: '', kelasId: '', password: '' });
      await fetchUsers();
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
      if (!res.ok) throw new Error(data.error || 'Gagal mendaftarkan orang tua');

      setSuccessMsg(`Akun Orang Tua ${data.data.nama} (NIK: ${data.data.nik}) berhasil dibuat! Username login: ${data.data.username}`);
      setFormOrtu({ nik: '', nama: '', siswaNisn: '', password: '' });
      await fetchUsers();
    } catch (err) {
      setErrorMsg(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Password Action
  const handleResetPassword = async () => {
    if (!resetModalUser || !newPasswordInput) return;
    try {
      const res = await apiFetch(`/api/admin/users/${resetModalUser.id}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mereset kata sandi');

      setSuccessMsg(`Kata sandi untuk ${resetModalUser.email} berhasil diperbarui.`);
      setResetModalUser(null);
      setNewPasswordInput('');
    } catch (err) {
      setErrorMsg(errorMessage(err));
    }
  };

  // Delete User Action
  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;
    try {
      const res = await apiFetch(`/api/admin/users/${deleteModalUser.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus pengguna');

      setSuccessMsg(`Akun ${deleteModalUser.email} berhasil dihapus.`);
      setDeleteModalUser(null);
      await fetchUsers();
    } catch (err) {
      setErrorMsg(errorMessage(err));
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const q = searchQuery.toLowerCase();
      const profileName = u.siswa?.nama || u.guru?.nama || u.ortu?.nama || '';
      const profileId = u.siswa?.nisn || u.guru?.nip || u.ortu?.nik || '';
      const matchesSearch = !q || 
        u.email.toLowerCase().includes(q) || 
        profileName.toLowerCase().includes(q) || 
        profileId.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  // Role Counts
  const roleStats = useMemo(() => {
    const stats: Record<string, number> = { ALL: users.length, SISWA: 0, GURU_MAPEL: 0, GURU_WALI: 0, ORTU: 0, ADMIN: 0 };
    users.forEach((u) => {
      if (stats[u.role] !== undefined) stats[u.role]++;
    });
    return stats;
  }, [users]);

  if (!isAuthorized) {
    return (
      <div className="bg-card rounded-xl border border-separator p-8 text-center flex flex-col items-center gap-3 max-w-md mx-auto my-12">
        <div className="p-3 rounded-full bg-red-500/10 text-red-600">
          <ShieldCheck size={36} />
        </div>
        <h2 className="text-lg font-bold text-label">Akses Terbatas</h2>
        <p className="text-xs text-label-secondary">
          Halaman manajemen akun dan registrasi kredensial hanya dapat diakses oleh akun Administrator.
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
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Administrator Security Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label">
            Manajemen Akun & Hak Akses
          </h1>
          <p className="text-sm text-label-secondary mt-1">
            Daftarkan dan kelola kredensial akun menggunakan ID Unik resmi (NISN, NIP, NIK KTP).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { void fetchUsers(); }}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-separator bg-bg hover:bg-card-subtle text-label text-xs font-medium transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-sm flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <span className="font-medium leading-relaxed">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-emerald-500/20 rounded-md transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[var(--status-fail-bg)] border border-red-500/30 text-[var(--status-fail)] text-sm flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="p-1 hover:bg-red-500/20 rounded-md transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-separator/80 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'users'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-card hover:bg-card-subtle border border-separator text-label-secondary hover:text-label'
          }`}
        >
          <ShieldCheck size={16} />
          <span>Daftar Pengguna</span>
          <span className="ml-1 text-xs px-1.5 py-0.2 rounded-full bg-black/15 font-mono">{roleStats.ALL}</span>
        </button>

        <button
          onClick={() => setActiveTab('siswa')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'siswa'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-card hover:bg-card-subtle border border-separator text-label-secondary hover:text-label'
          }`}
        >
          <GraduationCap size={16} />
          <span>Registrasi Siswa (NISN)</span>
        </button>

        <button
          onClick={() => setActiveTab('guru_mapel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'guru_mapel'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-card hover:bg-card-subtle border border-separator text-label-secondary hover:text-label'
          }`}
        >
          <Users size={16} />
          <span>Guru Mapel (NIP)</span>
        </button>

        <button
          onClick={() => setActiveTab('guru_wali')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'guru_wali'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-card hover:bg-card-subtle border border-separator text-label-secondary hover:text-label'
          }`}
        >
          <UserCheck size={16} />
          <span>Guru Wali (NIP)</span>
        </button>

        <button
          onClick={() => setActiveTab('ortu')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'ortu'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-card hover:bg-card-subtle border border-separator text-label-secondary hover:text-label'
          }`}
        >
          <HeartHandshake size={16} />
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    roleFilter === r
                      ? 'bg-primary text-white'
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
                placeholder="Cari nama, ID (NISN/NIP/NIK), email..."
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
                                className="p-1 hover:bg-fill rounded text-label-tertiary hover:text-label transition-colors"
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
                            {u.guru && u.guru.penugasanWali?.length > 0 && (
                              <span>Wali Kelas: <strong className="text-label">{u.guru.penugasanWali[0]?.kelas.nama}</strong></span>
                            )}
                            {u.guru && u.guru.penugasanMapel?.length > 0 && (
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
                                className="p-1.5 rounded-lg border border-separator bg-bg hover:bg-card-subtle text-label-secondary hover:text-label transition-colors"
                              >
                                <KeyRound size={15} />
                              </button>
                              {u.role !== 'ADMIN' && (
                                <button
                                  onClick={() => setDeleteModalUser(u)}
                                  title="Hapus Pengguna"
                                  className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-[var(--status-fail)] transition-colors"
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

      {/* ================= TAB 2: DAFTAR SISWA ================= */}
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

          <div className="mb-5 p-3.5 rounded-lg bg-primary-subtle border border-primary-border text-xs text-primary leading-relaxed flex items-start gap-2.5">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <span><strong>Prinsip 1 ID = 1 Akun:</strong> Setiap NISN 10 digit hanya dapat digunakan untuk satu akun siswa resmi. Sistem secara otomatis mencegah duplikasi atau kloning akun.</span>
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
              <span className="text-[11px] text-label-tertiary mt-1 block">Akan digunakan sebagai kredensial login siswa.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Nama Lengkap Siswa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nama lengkap sesuai akta / kartu keluarga"
                value={formSiswa.nama}
                onChange={(e) => setFormSiswa({ ...formSiswa, nama: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Kelas
              </label>
              <select
                value={formSiswa.kelasId}
                onChange={(e) => setFormSiswa({ ...formSiswa, kelasId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">-- Pilih Kelas Penempatan (Opsional) --</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>Kelas {k.nama} (Tingkat {k.tingkat})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Hubungkan NIK KTP Orang Tua (Opsional)
              </label>
              <input
                type="text"
                maxLength={16}
                placeholder="Masukkan NIK 16 digit jika akun orang tua sudah terdaftar"
                value={formSiswa.ortuNik}
                onChange={(e) => setFormSiswa({ ...formSiswa, ortuNik: e.target.value.replace(/\D/g, '') })}
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
                value={formSiswa.password}
                onChange={(e) => setFormSiswa({ ...formSiswa, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <UserPlus size={16} />
                <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Akun Siswa'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 3: DAFTAR GURU MAPEL ================= */}
      {activeTab === 'guru_mapel' && (
        <div className="bg-card rounded-xl border border-separator p-6 shadow-sm max-w-2xl">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-separator">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-label">Registrasi Guru Mata Pelajaran</h2>
              <p className="text-xs text-label-secondary">Guru yang hanya berfokus pada penginputan nilai mata pelajaran yang diampu.</p>
            </div>
          </div>

          <div className="mb-5 p-3.5 rounded-lg bg-primary-subtle border border-primary-border text-xs text-primary leading-relaxed flex items-start gap-2.5">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <span><strong>Ketentuan Guru:</strong> Setiap guru hanya boleh memiliki 1 akun login terdaftar (1 NIP). Jika guru merangkap sebagai Wali Kelas, silakan daftarkan pada tab <strong>Guru Wali Kelas</strong>.</span>
          </div>

          <form onSubmit={handleRegisterGuruMapel} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                NIP Guru <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 198501012010011001"
                value={formGuruMapel.nip}
                onChange={(e) => setFormGuruMapel({ ...formGuruMapel, nip: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <span className="text-[11px] text-label-tertiary mt-1 block">Akan digunakan sebagai username login Guru.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Nama Lengkap & Gelar <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Budi Santoso, S.Pd."
                value={formGuruMapel.nama}
                onChange={(e) => setFormGuruMapel({ ...formGuruMapel, nama: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Mata Pelajaran yang Diampu (Pilih Satu atau Lebih)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-lg border border-separator bg-bg">
                {mapelList.map((m) => {
                  const isChecked = formGuruMapel.mapelIds.includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2 text-xs text-label cursor-pointer p-1.5 rounded hover:bg-card">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormGuruMapel({ ...formGuruMapel, mapelIds: [...formGuruMapel.mapelIds, m.id] });
                          } else {
                            setFormGuruMapel({ ...formGuruMapel, mapelIds: formGuruMapel.mapelIds.filter((id) => id !== m.id) });
                          }
                        }}
                        className="rounded border-separator text-primary focus:ring-primary"
                      />
                      <span>{m.nama}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Penugasan Kelas Utama (Opsional)
              </label>
              <select
                value={formGuruMapel.kelasId}
                onChange={(e) => setFormGuruMapel({ ...formGuruMapel, kelasId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">-- Pilih Kelas Penugasan Awal --</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>Kelas {k.nama}</option>
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
                value={formGuruMapel.password}
                onChange={(e) => setFormGuruMapel({ ...formGuruMapel, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <UserPlus size={16} />
                <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Akun Guru Mapel'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 4: DAFTAR GURU WALI ================= */}
      {activeTab === 'guru_wali' && (
        <div className="bg-card rounded-xl border border-separator p-6 shadow-sm max-w-2xl">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-separator">
            <div className="w-10 h-10 rounded-xl bg-primary-subtle border border-primary-border text-primary flex items-center justify-center shrink-0">
              <UserCheck size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-label">Registrasi Guru Wali Kelas</h2>
              <p className="text-xs text-label-secondary">Guru dengan wewenang mengelola rekapitulasi, catatan rapor, dan kenaikan kelas binaan.</p>
            </div>
          </div>

          <div className="mb-5 p-3.5 rounded-lg bg-primary-subtle border border-primary-border text-xs text-primary leading-relaxed flex items-start gap-2.5">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <span><strong>Akun Komprehensif Wali:</strong> Akun Guru Wali Kelas secara otomatis memiliki hak akses mengajar mata pelajaran dan merekapitulasi rapor kelas binaan. Tidak diperlukan akun ganda.</span>
          </div>

          <form onSubmit={handleRegisterGuruWali} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                NIP Guru <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 198002152005012003"
                value={formGuruWali.nip}
                onChange={(e) => setFormGuruWali({ ...formGuruWali, nip: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <span className="text-[11px] text-label-tertiary mt-1 block">Akan digunakan sebagai username login Wali Kelas.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Nama Lengkap & Gelar <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Dra. Siti Rahmah, M.Pd."
                value={formGuruWali.nama}
                onChange={(e) => setFormGuruWali({ ...formGuruWali, nama: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-label mb-1.5">
                Kelas Binaan yang Ditetapkan <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formGuruWali.kelasId}
                onChange={(e) => setFormGuruWali({ ...formGuruWali, kelasId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-separator bg-bg text-sm text-label focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">-- Pilih Kelas Binaan --</option>
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
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <UserPlus size={16} />
                <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Akun Guru Wali'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 5: DAFTAR ORTU ================= */}
      {activeTab === 'ortu' && (
        <div className="bg-card rounded-xl border border-separator p-6 shadow-sm max-w-2xl">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-separator">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0">
              <HeartHandshake size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-label">Registrasi Akun Orang Tua</h2>
              <p className="text-xs text-label-secondary">Username login menggunakan NIK KTP 16 digit. Orang tua dapat memantau rapor dan memberikan catatan semester.</p>
            </div>
          </div>

          <div className="mb-5 p-3.5 rounded-lg bg-primary-subtle border border-primary-border text-xs text-primary leading-relaxed flex items-start gap-2.5">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <span><strong>Kebijakan Multi-Anak:</strong> Satu akun Orang Tua (NIK 16 digit) dapat terhubung ke banyak anak sekaligus. Jika akun orang tua sudah pernah dibuat, cukup tautkan NIK ini saat mendaftarkan siswa baru.</span>
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
              <span className="text-[11px] text-label-tertiary mt-1 block">Akan digunakan sebagai username login orang tua.</span>
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
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <UserPlus size={16} />
                <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Akun Orang Tua'}</span>
              </button>
            </div>
          </form>
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
              <button onClick={() => setResetModalUser(null)} className="p-1 rounded-lg hover:bg-fill text-label-secondary">
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
                className="px-4 py-2 rounded-lg border border-separator bg-bg hover:bg-card-subtle text-label text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={newPasswordInput.length < 6}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
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
