// frontend/src/app/dashboard/layout.tsx
'use client';
import { ReactNode, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  FileSpreadsheet,
  Award,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  School,
  ShieldCheck,
  Menu,
  X,
  Calendar
} from 'lucide-react';
import GlassModal from '../components/GlassModal';
import { apiFetch, formatRoleLabel } from '@/lib/api';
import { useTheme } from '@/lib/ThemeContext';
import { AcademicYearProvider, useAcademicYear } from '@/lib/AcademicYearContext';

function DashboardContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { semester, tahunAjaran, yearOptions, setSemester, setTahunAjaran, isLoading: isYearLoading } = useAcademicYear();

  const [isClient, setIsClient] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('ADMIN');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    let active = true;
    apiFetch('/api/auth/me')
      .then(async (response) => {
        if (!response.ok) throw new Error('Sesi tidak berlaku.');
        const profile = await response.json();
        if (active) {
          const role = String(profile.user?.role || '').toUpperCase();
          setUserRole(role);
          setUserEmail(String(profile.user?.email || ''));
          localStorage.setItem('siakad_role', role);
          setIsClient(true);
        }
      })
      .catch(() => {
        localStorage.removeItem('siakad_token');
        localStorage.removeItem('siakad_role');
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/';
      });
    return () => {
      active = false;
    };
  }, [router]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('siakad_token');
    localStorage.removeItem('siakad_role');
    setShowLogoutModal(false);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/';
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const navItems = useMemo(() => {
    const items = [
      { name: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'GURU', 'GURU_MAPEL', 'GURU_WALI', 'SISWA', 'ORTU'] },
      { name: 'Manajemen Sistem', href: '/dashboard/manajemen', icon: ShieldCheck, roles: ['ADMIN'] },
      { name: 'Data Siswa', href: '/dashboard/siswa', icon: GraduationCap, roles: ['ADMIN', 'GURU_MAPEL', 'GURU_WALI', 'GURU'] },
      { name: 'Input Nilai', href: '/dashboard/nilai', icon: FileSpreadsheet, roles: ['ADMIN', 'GURU_MAPEL', 'GURU_WALI', 'GURU'] },
      { name: 'Leger & Wali Kelas', href: '/dashboard/wali', icon: Award, roles: ['ADMIN', 'GURU_WALI'] },
      { name: 'Rapor Siswa', href: '/dashboard/rapor', icon: Award, roles: ['SISWA', 'ORTU'] }
    ];

    return items.filter((item) => item.roles.includes(userRole));
  }, [userRole]);

  const activePageTitle = useMemo(() => {
    const current = navItems.find((item) => item.href === pathname);
    return current ? current.name : 'E-Rapor SMP Al-Hidayah';
  }, [navItems, pathname]);

  if (!isClient) {
    return (
      <div className="min-h-[100dvh] bg-bg flex flex-col md:flex-row">
        <div className="hidden md:block w-[236px] shrink-0 p-4">
          <div className="h-9 rounded-lg bg-fill mb-6" />
          <div className="flex flex-col gap-2">
            <div className="h-8 rounded-lg bg-fill" />
            <div className="h-8 rounded-lg bg-fill/70" />
            <div className="h-8 rounded-lg bg-fill/50" />
          </div>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-12 px-6 flex items-center justify-between">
            <div className="w-36 h-4 rounded bg-fill" />
            <div className="w-48 h-7 rounded-lg bg-fill" />
          </div>
          <div className="flex-1 bg-bg-secondary md:mr-2 md:mb-2 md:rounded-2xl border border-separator p-6">
            <div className="w-64 h-6 rounded bg-fill mb-3" />
            <div className="w-96 h-4 rounded bg-fill/70 mb-6" />
            <div className="h-24 rounded-xl bg-fill/50 border border-separator" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-bg text-label flex flex-col md:flex-row transition-colors duration-150">
      {/* Sidebar Desktop (L-Frame Chrome) */}
      <aside
        className={`hidden md:flex flex-col h-[100dvh] sticky top-0 py-3.5 px-3 z-40 transition-[width] duration-200 ease-out shrink-0 print:hidden ${
          isCollapsed ? 'w-[70px]' : 'w-[236px]'
        }`}
      >
        {/* Product Mark & School Identity */}
        <div className={`px-1.5 mb-5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} min-h-[38px]`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                <School size={17} strokeWidth={2} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-label truncate leading-tight">
                  SMP Al-Hidayah
                </p>
                <p className="text-xs text-label-secondary truncate leading-tight">
                  {formatRoleLabel(userRole)}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-fill text-label-secondary transition-colors shrink-0 cursor-pointer"
            aria-label={isCollapsed ? 'Perlebar Sidebar' : 'Ciutkan Sidebar'}
            title={isCollapsed ? 'Perlebar Navigasi' : 'Ciutkan Navigasi'}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto" aria-label="Navigasi Utama">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center h-9 px-2.5 rounded-lg transition-colors duration-150 text-sm ${
                  isCollapsed ? 'justify-center' : 'gap-2.5'
                } ${
                  isActive
                    ? 'bg-bg-secondary border border-separator text-primary font-medium'
                    : 'text-label-secondary hover:text-label hover:bg-fill font-normal'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon size={16} strokeWidth={isActive ? 2 : 1.75} className="shrink-0" aria-hidden="true" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Utility: Logout */}
        <div className="mt-auto pt-3 border-t border-separator">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center h-9 px-2.5 rounded-lg text-[var(--status-fail)] hover:bg-[var(--status-fail-bg)] transition-colors text-sm cursor-pointer ${
              isCollapsed ? 'justify-center' : 'gap-2.5'
            }`}
            title={isCollapsed ? 'Keluar dari Sistem' : undefined}
          >
            <LogOut size={16} strokeWidth={1.75} className="shrink-0" />
            {!isCollapsed && <span className="font-medium">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Integrated 48px Chrome Topbar */}
        <header className="h-12 px-4 sm:px-6 flex items-center justify-between bg-bg sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-1.5 -ml-1 rounded-lg border border-separator bg-bg-secondary text-label hover:bg-fill transition-colors cursor-pointer"
              title="Buka Navigasi"
              aria-label="Buka Navigasi"
            >
              <Menu size={17} />
            </button>

            <span className="text-xs text-label-secondary hidden sm:inline">
              E-Rapor Al-Hidayah
            </span>
            <span className="text-label-tertiary hidden sm:inline">/</span>
            <span className="text-sm font-medium text-label truncate">
              {activePageTitle}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {!isYearLoading && (
              <div className="flex items-center gap-1.5 bg-bg-secondary px-1.5 py-0.5 rounded-lg border border-separator">
                <Calendar size={13} className="text-label-secondary hidden lg:inline ml-1" />
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="h-7 px-1.5 rounded bg-transparent text-label text-xs font-medium focus:outline-none cursor-pointer"
                  title="Pilih Semester"
                  aria-label="Semester"
                >
                  <option value="GANJIL">Ganjil</option>
                  <option value="GENAP">Genap</option>
                </select>
                <span className="text-separator">|</span>
                <select
                  value={tahunAjaran}
                  onChange={(e) => setTahunAjaran(e.target.value)}
                  className="h-7 px-1.5 rounded bg-transparent text-label text-xs font-id focus:outline-none cursor-pointer"
                  title="Pilih Tahun Ajaran"
                  aria-label="Tahun Ajaran"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="h-8 w-8 rounded-lg border border-separator bg-bg-secondary hover:bg-card-subtle text-label-secondary flex items-center justify-center transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              aria-label="Toggle Tema"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* User Identity */}
            <div className="flex items-center gap-2 pl-2 border-l border-separator">
              <div className="w-7 h-7 rounded-full bg-primary-subtle border border-primary-border text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:flex flex-col">
                <span className="text-xs font-medium text-label leading-tight truncate max-w-[140px]">
                  {userEmail}
                </span>
                <span className="text-[11px] text-label-secondary leading-tight">
                  {formatRoleLabel(userRole)}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* White Working Sheet (Inset 8px from right and bottom on desktop) */}
        <div className="flex-1 bg-bg-secondary md:mr-2 md:mb-2 rounded-none md:rounded-2xl border-t md:border border-separator print:border-none print:m-0 print:rounded-none">
          <main className="p-4 sm:p-6 max-w-[1260px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Slide-Over Drawer Navigation */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/45 transition-opacity animate-in fade-in duration-150"
            aria-hidden="true"
          />

          <div className="relative w-[272px] max-w-[85vw] bg-bg-secondary h-full flex flex-col p-4 border-r border-separator z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-separator mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                  <School size={17} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-label leading-tight">
                    SMP Al-Hidayah
                  </p>
                  <p className="text-xs text-label-secondary leading-tight">
                    {formatRoleLabel(userRole)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-fill text-label-secondary transition-colors cursor-pointer"
                title="Tutup Menu"
                aria-label="Tutup Menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 flex flex-col gap-1 overflow-y-auto" aria-label="Navigasi Mobile">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className={`flex items-center gap-3 h-10 px-3 rounded-lg transition-colors text-sm ${
                      isActive
                        ? 'bg-primary-subtle border border-primary-border text-primary font-medium'
                        : 'text-label-secondary hover:text-label hover:bg-fill font-normal'
                    }`}
                  >
                    <item.icon size={17} strokeWidth={isActive ? 2 : 1.75} className="shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-separator mt-auto flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1 py-1">
                <div className="w-7 h-7 rounded-full bg-primary-subtle border border-primary-border text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-label truncate">
                    {userEmail}
                  </span>
                  <span className="text-[11px] text-label-secondary">
                    {formatRoleLabel(userRole)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 h-10 px-3 rounded-lg text-[var(--status-fail)] hover:bg-[var(--status-fail-bg)] transition-colors text-sm font-medium cursor-pointer"
              >
                <LogOut size={17} strokeWidth={1.75} className="shrink-0" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Konfirmasi Keluar */}
      <GlassModal
        isOpen={showLogoutModal}
        type="confirm"
        title="Konfirmasi Keluar"
        description="Apakah Anda yakin ingin keluar dari sesi E-Rapor SMP Al-Hidayah?"
        confirmLabel="Ya, Keluar"
        cancelLabel="Batal"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AcademicYearProvider>
      <DashboardContent>{children}</DashboardContent>
    </AcademicYearProvider>
  );
}
