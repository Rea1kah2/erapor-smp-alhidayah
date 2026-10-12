// frontend/src/app/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AlertCircle, 
  CheckCircle2, 
  GraduationCap, 
  Users, 
  Heart, 
  ArrowRight, 
  Lock, 
  Mail, 
  User, 
  FileText, 
  School
} from 'lucide-react';
import GlassModal from './components/GlassModal';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register State
  const [regRole, setRegRole] = useState<'GURU' | 'SISWA' | 'ORTU'>('GURU');
  const [regNama, setRegNama] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regNip, setRegNip] = useState('');
  const [regNisn, setRegNisn] = useState('');
  const [regKelasId, setRegKelasId] = useState('');
  const [regAnakNisn, setRegAnakNisn] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState('');

  // Data Referensi Kelas untuk dropdown register siswa
  const [kelasList, setKelasList] = useState<any[]>([]);

  // Pop-up Feedback Modal
  const [modalSuccess, setModalSuccess] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onContinue?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: ''
  });

  useEffect(() => {
    // Ambil daftar kelas untuk opsi pendaftaran siswa
    fetch('http://localhost:3001/api/master/kelas')
      .then(res => res.ok ? res.json() : [])
      .then(data => setKelasList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Handler Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal login, periksa kembali email dan password Anda.');
      }

      // Simpan kredensial token
      localStorage.setItem('siakad_token', data.token);
      localStorage.setItem('siakad_role', data.role);

      // Tampilkan Modal Sambutan Berhasil Login
      setModalSuccess({
        isOpen: true,
        title: `Selamat Datang di E-Rapor!`,
        description: `Autentikasi berhasil sebagai ${data.role}. Menyiapkan dashboard akademik Anda...`,
        onContinue: () => {
          setModalSuccess(prev => ({ ...prev, isOpen: false }));
          router.push('/dashboard');
        }
      });

      // Otomatis redirect setelah 1.2 detik jika modal tidak diklik
      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);

    } catch (error: any) {
      setLoginError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handler Registrasi
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setRegError('');

    try {
      const payload: any = {
        role: regRole,
        nama: regNama,
        email: regEmail,
        password: regPassword,
      };

      if (regRole === 'GURU' && regNip) payload.nip = regNip;
      if (regRole === 'SISWA') {
        payload.nisn = regNisn;
        if (regKelasId) payload.kelasId = regKelasId;
      }
      if (regRole === 'ORTU' && regAnakNisn) payload.anakNisn = regAnakNisn;

      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal registrasi akun. Silakan coba kembali.');
      }

      // Modal Sukses Registrasi
      setModalSuccess({
        isOpen: true,
        title: 'Akun Berhasil Didaftarkan!',
        description: `Akun ${regNama} (${regRole}) telah aktif langsung. Silakan masuk menggunakan email dan password Anda.`,
        onContinue: () => {
          setModalSuccess(prev => ({ ...prev, isOpen: false }));
          // Alihkan form ke login dengan auto-fill email
          setLoginEmail(regEmail);
          setLoginPassword('');
          setMode('login');
        }
      });

      // Reset form registrasi
      setRegNama('');
      setRegEmail('');
      setRegPassword('');
      setRegNip('');
      setRegNisn('');
      setRegAnakNisn('');

    } catch (error: any) {
      setRegError(error.message);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-bg px-4 py-12 transition-colors duration-300">
      
      {/* Dynamic Liquid Mesh Aura Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60 dark:opacity-40 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-accent rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse"></div>
        <div className="absolute top-1/2 -right-24 w-[450px] h-[450px] bg-[var(--green)] rounded-full mix-blend-multiply filter blur-[110px] opacity-35"></div>
        <div className="absolute -bottom-24 left-1/3 w-[500px] h-[500px] bg-[#af52de] rounded-full mix-blend-multiply filter blur-[120px] opacity-30"></div>
      </div>

      <div 
        className="relative z-10 glass glass-thick w-full max-w-lg p-7 sm:p-9 shadow-2xl rounded-[32px] border border-separator/40 flex flex-col gap-6"
        style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}
      >
        
        {/* BRANDING HEADER */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass glass-accent text-white mb-3 shadow-lg transform hover:scale-105 transition-transform">
            <span className="text-2xl font-black tracking-tight">AH</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-label tracking-tight">
            E-Rapor SMP Al-Hidayah
          </h1>
          <p className="text-label-secondary text-xs sm:text-sm mt-1">
            Sistem Informasi Evaluasi Belajar Peserta Didik & Rekapitulasi Rapor
          </p>
        </div>

        {/* TAB SWITCHER (MASUK / DAFTAR) */}
        <div className="flex p-1 rounded-full bg-fill/50 border border-separator/30">
          <button
            type="button"
            onClick={() => { setMode('login'); setLoginError(''); }}
            className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              mode === 'login'
                ? 'bg-bg text-label shadow-sm'
                : 'text-label-secondary hover:text-label'
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setRegError(''); }}
            className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              mode === 'register'
                ? 'bg-bg text-label shadow-sm'
                : 'text-label-secondary hover:text-label'
            }`}
          >
            Daftar Akun Baru
          </button>
        </div>

        {/* ================= FORM LOGIN ================= */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4 animate-in fade-in duration-200">
            {loginError && (
              <div className="p-3.5 rounded-[18px] bg-[var(--red)]/15 border border-[var(--red)]/30 text-[var(--red)] flex items-center gap-2.5 text-xs sm:text-sm font-medium">
                <AlertCircle size={18} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-label">Alamat Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-label-secondary" />
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={isLoggingIn}
                  className="w-full h-11 pl-10 pr-4 rounded-[14px] bg-fill text-label text-sm placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                  placeholder="admin@sekolah.com / guru@sekolah.com"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-label">Kata Sandi</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-label-secondary" />
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={isLoggingIn}
                  className="w-full h-11 pl-10 pr-4 rounded-[14px] bg-fill text-label text-sm placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="mt-2 h-11 rounded-full glass glass-accent text-white font-semibold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoggingIn ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= FORM REGISTER ================= */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4 animate-in fade-in duration-200">
            {regError && (
              <div className="p-3.5 rounded-[18px] bg-[var(--red)]/15 border border-[var(--red)]/30 text-[var(--red)] flex items-center gap-2.5 text-xs sm:text-sm font-medium">
                <AlertCircle size={18} className="shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {/* Role Picker (Guru, Siswa, Ortu) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-label">Daftar Sebagai Peran:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRegRole('GURU')}
                  className={`p-2.5 rounded-[16px] border flex flex-col items-center gap-1 transition-all ${
                    regRole === 'GURU'
                      ? 'border-accent bg-accent/15 text-accent font-bold'
                      : 'border-separator/40 hover:bg-fill text-label-secondary'
                  }`}
                >
                  <Users size={18} />
                  <span className="text-xs">Guru</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegRole('SISWA')}
                  className={`p-2.5 rounded-[16px] border flex flex-col items-center gap-1 transition-all ${
                    regRole === 'SISWA'
                      ? 'border-accent bg-accent/15 text-accent font-bold'
                      : 'border-separator/40 hover:bg-fill text-label-secondary'
                  }`}
                >
                  <GraduationCap size={18} />
                  <span className="text-xs">Siswa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegRole('ORTU')}
                  className={`p-2.5 rounded-[16px] border flex flex-col items-center gap-1 transition-all ${
                    regRole === 'ORTU'
                      ? 'border-accent bg-accent/15 text-accent font-bold'
                      : 'border-separator/40 hover:bg-fill text-label-secondary'
                  }`}
                >
                  <Heart size={18} />
                  <span className="text-xs">Orang Tua</span>
                </button>
              </div>
            </div>

            {/* Nama Lengkap */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-label">Nama Lengkap</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-label-secondary" />
                <input 
                  type="text" 
                  value={regNama}
                  onChange={(e) => setRegNama(e.target.value)}
                  disabled={isRegistering}
                  className="w-full h-10 pl-10 pr-4 rounded-[14px] bg-fill text-label text-sm placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                  placeholder={regRole === 'GURU' ? 'Drs. Ahmad Fauzi' : regRole === 'SISWA' ? 'Budi Santoso' : 'Heri Kurniawan'}
                  required
                />
              </div>
            </div>

            {/* Kondisional Guru: NIP */}
            {regRole === 'GURU' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">NIP (Nomor Induk Pegawai - Opsional)</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-label-secondary" />
                  <input 
                    type="text" 
                    value={regNip}
                    onChange={(e) => setRegNip(e.target.value)}
                    disabled={isRegistering}
                    className="w-full h-10 pl-10 pr-4 rounded-[14px] bg-fill text-label text-sm font-mono placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    placeholder="Contoh: 19800512 200501 1 003"
                  />
                </div>
              </div>
            )}

            {/* Kondisional Siswa: NISN & Kelas */}
            {regRole === 'SISWA' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-label">NISN Siswa</label>
                  <input 
                    type="text" 
                    value={regNisn}
                    onChange={(e) => setRegNisn(e.target.value)}
                    disabled={isRegistering}
                    className="w-full h-10 px-3.5 rounded-[14px] bg-fill text-label text-sm font-mono placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    placeholder="Contoh: 0081234567"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-label">Kelas Jenjang</label>
                  <select
                    value={regKelasId}
                    onChange={(e) => setRegKelasId(e.target.value)}
                    disabled={isRegistering}
                    className="w-full h-10 px-3 rounded-[14px] bg-fill text-label text-xs font-semibold outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Pilih Kelas (Opsional)</option>
                    {kelasList.map(k => (
                      <option key={k.id} value={k.id}>Kelas {k.nama} (Tingkat {k.tingkat})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Kondisional Orang Tua: NISN Anak */}
            {regRole === 'ORTU' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">NISN Siswa (Anak yang Dihubungkan)</label>
                <div className="relative">
                  <School size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-label-secondary" />
                  <input 
                    type="text" 
                    value={regAnakNisn}
                    onChange={(e) => setRegAnakNisn(e.target.value)}
                    disabled={isRegistering}
                    className="w-full h-10 pl-10 pr-4 rounded-[14px] bg-fill text-label text-sm font-mono placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    placeholder="Masukkan NISN anak Anda..."
                  />
                </div>
                <span className="text-[11px] text-label-tertiary">
                  *Jika siswa sudah terdaftar, akun orang tua akan otomatis tersinkronisasi.
                </span>
              </div>
            )}

            {/* Email & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Email Akun</label>
                <input 
                  type="email" 
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={isRegistering}
                  className="w-full h-10 px-3.5 rounded-[14px] bg-fill text-label text-sm placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                  placeholder="nama@email.com"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-label">Kata Sandi (Min. 6 Karakter)</label>
                <input 
                  type="password" 
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  disabled={isRegistering}
                  className="w-full h-10 px-3.5 rounded-[14px] bg-fill text-label text-sm placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isRegistering}
              className="mt-2 h-11 rounded-full glass glass-accent text-white font-semibold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isRegistering ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Mendaftarkan Akun...</span>
                </>
              ) : (
                <>
                  <span>Daftar Sekarang (Langsung Aktif)</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* FOOTER INFO */}
        <div className="text-center pt-2 border-t border-separator/20">
          <p className="text-[11px] text-label-secondary">
            SMP Al-Hidayah Medan &bull; Aplikasi Terintegrasi Nilai & E-Rapor Digital
          </p>
        </div>

      </div>

      {/* POP-UP SUCCESS MODAL */}
      <GlassModal
        isOpen={modalSuccess.isOpen}
        type="success"
        title={modalSuccess.title}
        description={modalSuccess.description}
        confirmLabel="Lanjutkan"
        onConfirm={modalSuccess.onContinue}
      />

    </main>
  );
}