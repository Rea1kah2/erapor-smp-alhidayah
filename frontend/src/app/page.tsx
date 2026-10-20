// frontend/src/app/page.tsx
'use client';
import { apiFetch } from "@/lib/api";
import { errorMessage } from '@/lib/errors';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AlertCircle, 
  ArrowRight, 
  Lock, 
  Mail
} from 'lucide-react';
import GlassModal from './components/GlassModal';

export default function AuthPage() {
  const router = useRouter();
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

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

  // Handler Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal login, periksa kembali email dan password Anda.');
      }

      // Simpan kredensial token
      localStorage.removeItem('siakad_token');
      localStorage.removeItem('siakad_role');

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

    } catch (error: unknown) {
      setLoginError(errorMessage(error, 'Gagal masuk.'));
    } finally {
      setIsLoggingIn(false);
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

        <p className="text-center text-xs text-label-secondary">Akun pengguna dibuat oleh Administrator sekolah.</p>

        {/* ================= FORM LOGIN ================= */}
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
