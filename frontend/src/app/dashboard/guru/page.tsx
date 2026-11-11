// frontend/src/app/dashboard/guru/page.tsx
'use client';
import { apiFetch } from "@/lib/api";
import { errorMessage } from '@/lib/errors';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, X, AlertCircle, Inbox, Pencil, Trash2, CheckCircle2, RefreshCw, Users, Search } from 'lucide-react';

interface Guru {
  id: string;
  nip: string | null;
  nama: string;
  user: { email: string };
}

export default function DataGuru() {
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Mode: null (tambah baru) atau ID guru (edit)
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({ nama: '', nip: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Delete Confirmation Modal
  const [deletingGuru, setDeletingGuru] = useState<Guru | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchGuru = useCallback(async () => {
    try {
      const res = await apiFetch('/api/master/guru');
      if (res.ok) {
        const data = await res.json();
        setGuruList(data);
      }
    } catch (error) {
      console.error('Gagal mengambil data guru', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { 
      void fetchGuru(); 
      apiFetch('/api/auth/me')
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setIsAdmin(data.user?.role === 'ADMIN');
          }
        })
        .catch(() => {});
    });
  }, [fetchGuru]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ nama: '', nip: '', email: '', password: '' });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (guru: Guru) => {
    setEditingId(guru.id);
    setFormData({
      nama: guru.nama,
      nip: guru.nip || '',
      email: guru.user.email,
      password: '',
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
        ? `/api/master/guru/${editingId}`
        : '/api/master/guru';
      const method = editingId ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses data guru');

      setIsModalOpen(false);
      setFormData({ nama: '', nip: '', email: '', password: '' });
      setSuccessMsg(editingId ? 'Data guru berhasil diperbarui!' : 'Guru baru berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchGuru();
    } catch (error: unknown) {
      setErrorMsg(errorMessage(error, 'Gagal menyimpan data guru.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGuru) return;
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const res = await apiFetch(`/api/master/guru/${deletingGuru.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus data guru');

      setDeletingGuru(null);
      setSuccessMsg('Data guru berhasil dihapus!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchGuru();
    } catch (error: unknown) {
      setErrorMsg(errorMessage(error, 'Gagal menghapus data guru.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredGuru = useMemo(() => {
    if (!searchQuery.trim()) return guruList;
    const q = searchQuery.toLowerCase();
    return guruList.filter(g => 
      g.nama.toLowerCase().includes(q) || 
      (g.nip && g.nip.includes(q)) || 
      g.user.email.toLowerCase().includes(q)
    );
  }, [guruList, searchQuery]);

  return (
    <div className="flex flex-col gap-5">
      
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label flex items-center gap-2">
            <Users className="text-primary" size={24} />
            <span>Manajemen Tenaga Pendidik (Guru)</span>
          </h1>
          <p className="text-xs sm:text-sm text-label-secondary mt-0.5">
            Kelola master data dewan guru dan akun penugasan akademik SMP Al-Hidayah
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={openAddModal}
            className="h-9 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} />
            <span>Tambah Guru Baru</span>
          </button>
        )}
      </div>

      {/* Notifikasi */}
      {successMsg && (
        <div className="p-3 rounded-lg flex items-center gap-2.5 bg-primary-subtle border border-primary-border text-primary text-xs font-medium">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !isModalOpen && !deletingGuru && (
        <div className="p-3 rounded-lg flex items-center gap-2.5 bg-[var(--status-fail-bg)] border border-[var(--status-fail-border)] text-[var(--status-fail)] text-xs font-medium">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabel Data Guru */}
      <section className="bg-card rounded-xl border border-separator shadow-sm overflow-hidden flex flex-col">
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-separator bg-bg/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-label-secondary">
            Daftar Dewan Guru ({filteredGuru.length} Tenaga Pendidik)
          </span>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary" />
            <input 
              type="text"
              placeholder="Cari guru atau NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-bg border border-separator text-label text-xs placeholder:text-label-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead className="sticky top-0 z-20 bg-card border-b border-separator shadow-xs">
              <tr className="text-xs font-semibold text-label-secondary uppercase tracking-wider">
                <th className="px-4 py-3 w-40 font-mono">NIP</th>
                <th className="px-4 py-3">Nama Lengkap & Gelar</th>
                <th className="px-4 py-3">Email Akun Login</th>
                {isAdmin && <th className="px-4 py-3 w-24 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-separator">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="px-6 py-10 text-center text-label-secondary text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-primary" />
                      <span>Memuat data guru...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredGuru.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox size={36} className="text-label-tertiary" />
                      <p className="font-semibold text-sm text-label">Belum ada data guru</p>
                      <p className="text-xs text-label-secondary">Tambahkan data dewan guru pertama untuk penugasan kelas dan mapel.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGuru.map((guru) => (
                  <tr key={guru.id} className="hover:bg-bg/60 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-label-secondary tabular-nums">
                      {guru.nip || '-'}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-label text-sm">
                      {guru.nama}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-label-secondary">
                      {guru.user.email}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(guru)}
                            className="p-1.5 rounded-md hover:bg-card-subtle text-label-secondary hover:text-primary transition-colors cursor-pointer"
                            title="Edit Guru"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingGuru(guru)}
                            className="p-1.5 rounded-md hover:bg-[var(--status-fail-bg)] text-label-secondary hover:text-[var(--status-fail)] transition-colors cursor-pointer"
                            title="Hapus Guru"
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

      {/* Modal Tambah / Edit Guru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-separator shadow-xl relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-separator">
              <div>
                <h2 className="text-base font-bold text-label">
                  {editingId ? 'Edit Data Guru' : 'Tambah Guru Baru'}
                </h2>
                <p className="text-xs text-label-secondary">
                  {editingId ? 'Perbarui informasi guru & akun' : 'Sistem otomatis membuatkan akun login guru'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-fill text-label-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg flex items-start gap-2 bg-[var(--status-fail-bg)] border border-[var(--status-fail-border)] text-[var(--status-fail)] text-xs font-medium">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-label">Nama Lengkap & Gelar</label>
                <input 
                  type="text" required
                  value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Dra. Hj. Siti Rahmah, M.Pd"
                  className="h-9 px-3 rounded-lg bg-bg border border-separator text-label text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-label">NIP (Nomor Induk Pegawai)</label>
                <input 
                  type="text" 
                  value={formData.nip} onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="198503212009022001 (Opsional)"
                  className="h-9 px-3 rounded-lg bg-bg border border-separator text-label text-xs font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-label">Email Akun Login</label>
                <input 
                  type="email" required
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="guru@alhidayah.sch.id"
                  className="h-9 px-3 rounded-lg bg-bg border border-separator text-label text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-label">
                  Kata Sandi {editingId ? '(Biarkan kosong jika tidak diubah)' : '(Minimal 12 karakter)'}
                </label>
                <input 
                  type="password" 
                  minLength={12}
                  required={!editingId}
                  value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingId ? '••••••••••••' : 'Buat kata sandi akun'}
                  className="h-9 px-3 rounded-lg bg-bg border border-separator text-label text-xs focus:outline-none focus:border-primary"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-3 border-t border-separator">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 px-4 rounded-lg text-xs font-semibold text-label-secondary hover:bg-fill transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" disabled={isSubmitting}
                  className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deletingGuru && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-sm p-5 rounded-2xl border border-separator shadow-xl relative flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5 text-[var(--status-fail)]">
              <div className="p-2 rounded-lg bg-[var(--status-fail-bg)]">
                <Trash2 size={20} />
              </div>
              <h3 className="text-base font-bold text-label">Hapus Data Guru?</h3>
            </div>

            <p className="text-xs text-label-secondary leading-relaxed">
              Apakah Anda yakin ingin menghapus data <strong>{deletingGuru.nama}</strong>? Akun login terkait dan penugasan mengajar akan otomatis dibatalkan.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-separator">
              <button
                onClick={() => setDeletingGuru(null)}
                disabled={isDeleting}
                className="h-8 px-3 rounded-lg text-xs font-semibold text-label-secondary hover:bg-fill transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-8 px-3 rounded-lg bg-[var(--status-fail)] hover:opacity-90 text-white text-xs font-medium transition-opacity flex items-center gap-1.5"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
