// frontend/src/app/dashboard/akademik/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Plus, X, AlertCircle, Inbox, School, BookOpen, Pencil, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';

interface Guru { id: string; nama: string; }
interface Kelas { id: string; nama: string; tingkat: number; waliId?: string | null; wali: { nama: string } | null; }
interface Mapel { id: string; nama: string; kkm: number; guruId?: string | null; guru: { nama: string } | null; }

export default function DataAkademik() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('siakad_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resKelas, resMapel, resGuru] = await Promise.all([
        fetch('http://localhost:3001/api/master/kelas', { headers }),
        fetch('http://localhost:3001/api/master/mapel', { headers }),
        fetch('http://localhost:3001/api/master/guru', { headers })
      ]);

      if (resKelas.ok) setKelasList(await resKelas.json());
      if (resMapel.ok) setMapelList(await resMapel.json());
      if (resGuru.ok) setGuruList(await resGuru.json());
    } catch (error) {
      console.error('Gagal mengambil data akademik');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
      const token = localStorage.getItem('siakad_token');
      const url = editingKelasId
        ? `http://localhost:3001/api/master/kelas/${editingKelasId}`
        : 'http://localhost:3001/api/master/kelas';
      const method = editingKelasId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formKelas),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses kelas');

      setIsModalKelasOpen(false);
      setFormKelas({ nama: '', tingkat: '', waliId: '' });
      setSuccessMsg(editingKelasId ? 'Kelas berhasil diperbarui!' : 'Kelas berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
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
      const token = localStorage.getItem('siakad_token');
      const url = editingMapelId
        ? `http://localhost:3001/api/master/mapel/${editingMapelId}`
        : 'http://localhost:3001/api/master/mapel';
      const method = editingMapelId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formMapel),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses mapel');

      setIsModalMapelOpen(false);
      setFormMapel({ nama: '', kkm: '', guruId: '' });
      setSuccessMsg(editingMapelId ? 'Mapel berhasil diperbarui!' : 'Mapel berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
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
      const token = localStorage.getItem('siakad_token');
      const url = `http://localhost:3001/api/master/${deletingItem.type}/${deletingItem.id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Gagal menghapus ${deletingItem.type}`);

      setDeletingItem(null);
      setSuccessMsg(`Data ${deletingItem.type === 'kelas' ? 'kelas' : 'mata pelajaran'} berhasil dihapus!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
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