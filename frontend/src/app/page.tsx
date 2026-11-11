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
  Mail,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import GlassModal from './components/GlassModal';

function getLoginMessage(role: string): { title: string; description: string } {
  switch (role) {
    case 'ADMIN':
      return {
        title: 'Selamat Datang, Administrator',
        description: 'Anda masuk sebagai pengelola sistem E-Rapor. Mengarahkan ke panel administrasi…'
      };
    case 'GURU_MAPEL':
      return {
        title: 'Selamat Datang, Bapak/Ibu Guru',
        description: 'Anda masuk sebagai Guru Mata Pelajaran. Mengarahkan ke portal input nilai…'
      };
    case 'GURU_WALI':
      return {
        title: 'Selamat Datang, Bapak/Ibu Wali Kelas',
        description: 'Anda masuk sebagai Guru Wali Kelas. Mengarahkan ke rekap kelas binaan…'
      };
    case 'SISWA':
      return {
        title: 'Selamat Datang, Peserta Didik',
        description: 'Anda telah berhasil masuk ke E-Rapor. Mengarahkan ke portal nilai dan rapor Anda…'
      };
    case 'ORTU':
      return {
        title: 'Selamat Datang, Orang Tua/Wali Murid',
        description: 'Anda masuk sebagai Orang Tua Murid. Mengarahkan ke portal rapor putra-putri Anda…'
      };
    default:
      return {
        title: 'Autentikasi Berhasil',
        description: 'Mengarahkan ke dashboard sistem…'
      };
  }
}

export default function AuthPage() {
  const router = useRouter();
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
        throw new Error(data.error || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.');
      }

      localStorage.removeItem('siakad_token');
      localStorage.removeItem('siakad_role');

      const role = String(data.role || '').toUpperCase();
      localStorage.setItem('siakad_role', role);
      try {
        document.documentElement.setAttribute('data-role', role);
      } catch {}

      const msg = getLoginMessage(role);
      setModalSuccess({
        isOpen: true,
        title: msg.title,
        description: msg.description,
      });

      setTimeout(() => {
        setModalSuccess({ isOpen: false, title: '', description: '' });
        router.push('/dashboard');
      }, 2000);

    } catch (error: unknown) {
      setLoginError(errorMessage(error, 'Gagal masuk.'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-between relative bg-bg text-label px-4 py-8 sm:py-12 transition-colors duration-200">
      
      {/* Background Subtle Institutional Grid / Framing */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(var(--primary) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top Header Badge */}
      <div className="relative z-10 w-full max-w-md flex items-center justify-between text-xs text-label-secondary pb-4 border-b border-separator/60">
        <span className="font-medium tracking-wide">YAYASAN PENDIDIKAN ISLAM AL-HIDAYAH</span>
        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-fill font-semibold">NPSN: 10210892</span>
      </div>

      {/* Central Login Card */}
      <div className="relative z-10 w-full max-w-md bg-card rounded-2xl border border-separator shadow-sm sm:shadow-md p-6 sm:p-8 flex flex-col gap-6 my-auto">
        
        {/* Branding & Emblem */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-primary text-white flex items-center justify-center mb-3 shadow-sm">
            <GraduationCap size={28} strokeWidth={2} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-label">
            E-Rapor SMP Al-Hidayah
          </h1>
          <p className="text-xs sm:text-sm text-label-secondary mt-1 max-w-xs leading-relaxed">
            Sistem Informasi Evaluasi Belajar Peserta Didik & Rekapitulasi Rapor Digital
          </p>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {loginError && (
            <div className="p-3 rounded-lg bg-[var(--status-fail-bg)] border border-[var(--status-fail-border)] text-[var(--status-fail)] flex items-start gap-2.5 text-xs font-medium leading-relaxed">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-label">
                Email atau ID Pengguna
              </label>
              <span className="text-[10px] text-label-tertiary">NISN / NIP / NIK / Email</span>
            </div>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary" />
              <input 
                type="text" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={isLoggingIn}
                className="w-full h-10 pl-9 pr-3.5 rounded-lg bg-bg border border-separator text-label text-sm placeholder:text-label-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="NISN / NIP / NIK atau email resmi"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-label">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary" />
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={isLoggingIn}
                className="w-full h-10 pl-9 pr-3.5 rounded-lg bg-bg border border-separator text-label text-sm placeholder:text-label-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="••••••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoggingIn}
            className="mt-2 w-full h-10 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium text-sm shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isLoggingIn ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Memverifikasi Akun...</span>
              </>
            ) : (
              <>
                <span>Masuk ke Sistem</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security & Access Notice */}
        <div className="pt-3 border-t border-separator/60 flex items-center justify-center gap-1.5 text-xs text-label-secondary">
          <ShieldCheck size={14} className="text-primary shrink-0" />
          <span>Akses resmi guru, tenaga pendidik, siswa & orang tua</span>
        </div>

      </div>

      {/* Footer Branding */}
      <footer className="relative z-10 text-center text-xs text-label-secondary mt-6">
        <p>
          &copy; 2026 SMP Al-Hidayah Medan &bull; Jl. Letda Sujono No. 64, Medan Tembung
        </p>
      </footer>

      {/* Success Modal (auto-redirect, no button) */}
      <GlassModal
        isOpen={modalSuccess.isOpen}
        type="success"
        title={modalSuccess.title}
        description={modalSuccess.description}
      />

    </main>
  );
}
