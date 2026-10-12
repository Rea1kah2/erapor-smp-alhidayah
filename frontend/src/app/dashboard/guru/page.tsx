// frontend/src/app/dashboard/guru/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Plus, X, AlertCircle, Inbox, Pencil, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';

interface Guru {
  id: string;
  nip: string | null;
  nama: string;
  user: { email: string };
}

export default function DataGuru() {
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Mode: null (tambah baru) atau ID guru (edit)
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({ nama: '', nip: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Delete Confirmation Modal
  const [deletingGuru, setDeletingGuru] = useState<Guru | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchGuru = async () => {
    try {
      const token = localStorage.getItem('siakad_token');
      const res = await fetch('http://localhost:3001/api/master/guru', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGuruList(data);
      }
    } catch (error) {
      console.error('Gagal mengambil data guru', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuru();
  }, []);

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
      password: '', // Kosongkan password saat edit, hanya diisi jika ingin diubah
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
        ? `http://localhost:3001/api/master/guru/${editingId}`
        : 'http://localhost:3001/api/master/guru';
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

      if (!res.ok) throw new Error(data.error || 'Gagal memproses data guru');

      setIsModalOpen(false);
      setFormData({ nama: '', nip: '', email: '', password: '' });
      setSuccessMsg(editingId ? 'Data guru berhasil diperbarui!' : 'Guru baru berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchGuru();
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGuru) return;
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('siakad_token');
      const res = await fetch(`http://localhost:3001/api/master/guru/${deletingGuru.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus data guru');

      setDeletingGuru(null);
      setSuccessMsg('Data guru berhasil dihapus!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchGuru();
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
          <h1 className="text-[28px] font-bold text-label leading-tight">Data Guru</h1>
          <p className="text-[15px] text-label-secondary">Kelola master data tenaga pendidik</p>
        </div>
        <button 
          onClick={openAddModal}
          className="glass glass-accent h-11 px-5 rounded-full font-semibold text-white flex items-center justify-center gap-2 active:scale-95 transition-transform shrink-0 shadow-md"
        >
          <Plus size={20} strokeWidth={2} />
          <span>Tambah Guru</span>
        </button>
      </header>

      {/* Notifikasi Toast / Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl flex items-center gap-2.5 bg-[color-mix(in_srgb,var(--green)_15%,transparent)] text-label border border-[color-mix(in_srgb,var(--green)_30%,transparent)] shadow-sm">
          <CheckCircle2 size={18} className="text-[var(--green)] shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && !isModalOpen && !deletingGuru && (
        <div className="p-3.5 rounded-2xl flex items-center gap-2.5 bg-[color-mix(in_srgb,var(--red)_15%,transparent)] text-label border border-[color-mix(in_srgb,var(--red)_30%,transparent)] shadow-sm">
          <AlertCircle size={18} className="text-[var(--red)] shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Tabel Data (Solid, Non-Glass) */}
      <section className="bg-bg-secondary rounded-[28px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b-[0.5px] border-separator bg-bg/40">
                <th className="px-6 py-4 text-[13px] font-semibold text-label-secondary">NIP</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-label-secondary">NAMA LENGKAP</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-label-secondary">EMAIL (AKUN)</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-label-secondary text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="text-[15px] text-label divide-y divide-separator/40">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-label-secondary">
                    Memuat data...
                  </td>
                </tr>
              ) : guruList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox size={48} className="text-label-tertiary mb-2 strokeWidth={1}" />
                      <p className="font-semibold text-[17px]">Belum ada data guru</p>
                      <p className="text-[15px] text-label-secondary">Tambahkan guru pertama untuk memulai.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                guruList.map((guru) => (
                  <tr key={guru.id} className="hover:bg-fill/50 transition-colors">
                    <td className="px-6 py-4 font-medium tabular-nums">{guru.nip || '-'}</td>
                    <td className="px-6 py-4 font-semibold">{guru.nama}</td>
                    <td className="px-6 py-4 text-label-secondary">{guru.user.email}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(guru)}
                          className="p-2 rounded-full hover:bg-fill text-label-secondary hover:text-accent transition-colors"
                          title="Edit Guru"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          onClick={() => setDeletingGuru(guru)}
                          className="p-2 rounded-full hover:bg-fill text-label-secondary hover:text-[var(--red)] transition-colors"
                          title="Hapus Guru"
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
      </section>

      {/* Modal Tambah / Edit Guru (Glass Thick) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="glass glass-thick w-full max-w-lg p-6 relative flex flex-col gap-6" 
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
                {editingId ? 'Edit Data Guru' : 'Tambah Guru Baru'}
              </h2>
              <p className="text-[15px] text-label-secondary">
                {editingId 
                  ? 'Perbarui informasi profil dan akun guru.' 
                  : 'Sistem akan otomatis membuatkan akun login.'}
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
                  placeholder="Contoh: Budi Santoso, S.Pd"
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[15px] font-medium text-label">NIP (Opsional)</label>
                <input 
                  type="text" 
                  value={formData.nip} onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="19850101..."
                  className="h-11 px-4 rounded-[12px] bg-fill text-label focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[15px] font-medium text-label">Email Akun</label>
                <input 
                  type="email" required
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="guru@sekolah.com"
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
                  placeholder={editingId ? 'Biarkan kosong untuk mempertahankan sandi lama' : 'Default: guru12345'}
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
                  {isSubmitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deletingGuru && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="glass glass-thick w-full max-w-md p-6 relative flex flex-col gap-4" 
            style={{ '--glass-radius': 'var(--radius-2xl)' } as React.CSSProperties}
          >
            <div className="flex items-center gap-3 text-[var(--red)]">
              <div className="p-3 rounded-full bg-[color-mix(in_srgb,var(--red)_15%,transparent)]">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-label">Hapus Guru?</h3>
            </div>

            <p className="text-sm text-label-secondary">
              Apakah Anda yakin ingin menghapus data <strong>{deletingGuru.nama}</strong>? Akun login terkait dan penugasan mengajar akan otomatis dibatalkan.
            </p>

            {errorMsg && (
              <div className="p-3 rounded-lg text-sm bg-[color-mix(in_srgb,var(--red)_12%,transparent)] text-label">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setDeletingGuru(null)}
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