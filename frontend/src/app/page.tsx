// frontend/src/app/page.tsx
'use client';
import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  GraduationCap,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

const ROLE_GUIDE = [
  { role: 'Peserta Didik', idType: 'NISN (10 digit angka)' },
  { role: 'Guru Mapel & Wali Kelas', idType: 'NIP / NUPTK resmi' },
  { role: 'Orang Tua / Wali Murid', idType: 'NIK KTP (16 digit angka)' },
  { role: 'Administrator Sekolah', idType: 'Email institusi resmi' }
];

export default function AuthPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal masuk. Periksa kembali ID pengguna dan kata sandi Anda.');
      }

      localStorage.removeItem('siakad_token');
      localStorage.removeItem('siakad_role');

      const role = String(data.role || '').toUpperCase();
      localStorage.setItem('siakad_role', role);

      router.push('/dashboard');
    } catch (error: unknown) {
      setLoginError(errorMessage(error, 'Gagal masuk ke sistem.'));
      setIsLoggingIn(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-bg text-label flex flex-col justify-between px-4 py-6 sm:px-6 sm:py-8">
      {/* Top Institutional Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4 pb-4 border-b border-separator">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
            <GraduationCap size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-label truncate">
              Yayasan Pendidikan Islam Al-Hidayah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="font-id text-xs px-2.5 py-1 rounded-md bg-bg-secondary border border-separator text-label-secondary">
            NPSN 10210892
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-bg-secondary border border-separator hover:bg-card-subtle text-label-secondary transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
            aria-label="Toggle Tema"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Main Split Institutional Login Sheet */}
      <section className="w-full max-w-5xl mx-auto my-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-separator bg-bg-secondary overflow-hidden">
          {/* Left Institutional Panel */}
          <div className="lg:col-span-6 bg-[#14532d] text-white p-7 sm:p-10 flex flex-col justify-between gap-8">
            <div className="flex flex-col gap-4">
              <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-md bg-white/10 border border-white/15 text-xs font-medium text-[#fef3c7]">
                <span>Portal Akademik & E-Rapor Digital</span>
              </div>

              <h1 className="font-editorial text-2xl sm:text-3xl font-bold leading-snug text-white">
                SMP Swasta Islam Terpadu Al-Hidayah Medan
              </h1>

              <p className="text-sm text-[#d9eadf] leading-relaxed max-w-md">
                Pusat pencatatan penilaian Kurikulum Merdeka, pengelolaan leger wali kelas, dan transparansi laporan hasil belajar peserta didik berstandar A4.
              </p>
            </div>

            {/* Credential Access Reference */}
            <div className="flex flex-col gap-2.5 pt-6 border-t border-white/15">
              <p className="text-xs font-medium text-[#fef3c7]">
                Panduan Identitas Masuk Pengguna
              </p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                {ROLE_GUIDE.map((item) => (
                  <div key={item.role} className="flex flex-col">
                    <dt className="text-[#b8d4c2]">{item.role}</dt>
                    <dd className="font-medium text-white">{item.idType}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Right Sign-In Form Sheet */}
          <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-center gap-6 bg-bg-secondary">
            <div>
              <h2 className="text-xl font-semibold text-label">
                Masuk ke Akun Anda
              </h2>
              <p className="text-sm text-label-secondary mt-1">
                Gunakan nomor identitas sekolah (NISN, NIP, NIK) atau email terdaftar.
              </p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {loginError && (
                <div className="p-3 rounded-lg bg-[var(--status-fail-bg)] border border-[var(--status-fail-border)] text-[var(--status-fail)] flex items-start gap-2.5 text-xs font-medium leading-relaxed">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="login-identifier" className="text-sm font-medium text-label">
                    Email atau ID Pengguna
                  </label>
                  <span className="text-xs text-label-tertiary">NISN / NIP / NIK</span>
                </div>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary" />
                  <input
                    id="login-identifier"
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isLoggingIn}
                    autoComplete="username"
                    className="w-full h-10 pl-9 pr-3.5 rounded-lg bg-card-subtle border border-separator-strong text-label text-sm placeholder:text-label-tertiary focus:outline-none focus:bg-bg-secondary focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors duration-150"
                    placeholder="Contoh: 0081234567 atau email resmi"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-label">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-label-tertiary" />
                  <input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isLoggingIn}
                    autoComplete="current-password"
                    className="w-full h-10 pl-9 pr-3.5 rounded-lg bg-card-subtle border border-separator-strong text-label text-sm placeholder:text-label-tertiary focus:outline-none focus:bg-bg-secondary focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors duration-150"
                    placeholder="Masukkan kata sandi"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="mt-2 w-full h-10 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium text-sm transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

            <div className="pt-4 border-t border-separator flex items-center gap-2 text-xs text-label-secondary">
              <ShieldCheck size={15} className="text-primary shrink-0" />
              <span>Koneksi terenkripsi untuk guru, tenaga pendidik, siswa, dan orang tua</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="w-full max-w-5xl mx-auto pt-4 border-t border-separator flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-label-secondary">
        <span>SMP Swasta Islam Terpadu Al-Hidayah Medan</span>
        <span>Jl. Letda Sujono No. 64, Medan Tembung</span>
      </footer>
    </main>
  );
}
