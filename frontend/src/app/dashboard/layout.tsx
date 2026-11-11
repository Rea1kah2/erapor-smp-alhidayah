// frontend/src/app/dashboard/layout.tsx
'use client';
import { ReactNode, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
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
  X
} from 'lucide-react';
import GlassModal from '../components/GlassModal';
import { apiFetch, formatRoleLabel } from '@/lib/api';
import { useTheme } from '@/lib/ThemeContext';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
          try {
            document.documentElement.setAttribute('data-role', role);
          } catch {}
          setIsClient(true);
        }
      })
      .catch(() => {
        localStorage.removeItem('siakad_token');
        localStorage.removeItem('siakad_role');
        try {
          document.documentElement.removeAttribute('data-role');
        } catch {}
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/';
      });
    return () => { active = false; };
  }, [router]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('siakad_token');
    localStorage.removeItem('siakad_role');
    try {
      document.documentElement.removeAttribute('data-role');
    } catch {}
    setShowLogoutModal(false);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/';
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // Navigasi dinamis berbasis hak akses role
  const navItems = useMemo(() => {
    const items = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'GURU', 'GURU_MAPEL', 'GURU_WALI', 'SISWA', 'ORTU'] },
      { name: 'Manajemen Akun', href: '/dashboard/manajemen', icon: ShieldCheck, roles: ['ADMIN'] },
      { name: 'Data Guru', href: '/dashboard/guru', icon: Users, roles: ['ADMIN'] },
      { name: 'Data Siswa', href: '/dashboard/siswa', icon: GraduationCap, roles: ['ADMIN', 'GURU_MAPEL', 'GURU_WALI', 'GURU'] },
      { name: 'Akademik', href: '/dashboard/akademik', icon: BookOpen, roles: ['ADMIN'] },
      { name: 'Input Nilai', href: '/dashboard/nilai', icon: FileSpreadsheet, roles: ['ADMIN', 'GURU_MAPEL', 'GURU_WALI', 'GURU'] },
      { name: 'Rekap & Wali', href: '/dashboard/wali', icon: Award, roles: ['ADMIN', 'GURU_WALI', 'GURU'] },
      { name: 'Rapor Siswa', href: '/dashboard/rapor', icon: Award, roles: ['SISWA', 'ORTU'] },
    ];

    return items.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  // Dapatkan judul halaman aktif
  const activePageTitle = useMemo(() => {
    const current = navItems.find(item => item.href === pathname);
    return current ? current.name : 'E-Rapor SMP Al-Hidayah';
  }, [navItems, pathname]);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-label flex flex-col md:flex-row transition-colors duration-200">
      
      {/* Sidebar Desktop */}
      <aside 
        className={`hidden md:flex flex-col h-[calc(100vh-32px)] sticky top-4 glass m-4 rounded-2xl p-3 z-40 transition-all duration-200 ease-in-out shrink-0 shadow-sm ${
          isCollapsed ? 'w-[76px]' : 'w-[260px]'
        }`}
      >
        {/* Header Sidebar */}
        <div className={`p-2 mb-3 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-separator/60 pb-3`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                <School size={18} strokeWidth={2.2} />
              </div>
              <div className="overflow-hidden">
                <h2 className="text-sm font-bold tracking-tight text-label whitespace-nowrap">
                  SMP AL-HIDAYAH
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                    {formatRoleLabel(userRole)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-fill text-label-secondary transition-colors shrink-0"
            aria-label={isCollapsed ? 'Perlebar Sidebar' : 'Ciutkan Sidebar'}
            title={isCollapsed ? 'Perlebar' : 'Ciutkan'}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Menu Navigasi */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center h-10 px-3 rounded-lg transition-colors text-sm ${
                  isCollapsed ? 'justify-center' : 'gap-3'
                } ${
                  isActive 
                    ? 'bg-primary text-white font-medium shadow-sm' 
                    : 'text-label-secondary hover:text-label hover:bg-fill font-normal'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.75} className="shrink-0" aria-hidden="true" />
                
                <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${
                  isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'
                }`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Action */}
        <div className="mt-auto pt-2 border-t border-separator/60">
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center h-10 px-3 rounded-lg text-[var(--status-fail)] hover:bg-[var(--status-fail-bg)] transition-colors text-sm ${
              isCollapsed ? 'justify-center' : 'gap-3'
            }`}
            title={isCollapsed ? 'Keluar' : undefined}
          >
            <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 font-medium ${
              isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'
            }`}>
              Keluar
            </span>
          </button>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Bar Terintegrasi */}
        <header className="h-14 border-b border-separator/60 px-4 sm:px-6 flex items-center justify-between bg-card/60 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-2">
            {/* Hamburger Button for Mobile Drawer */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 -ml-1.5 rounded-lg border border-separator text-label hover:bg-fill transition-colors cursor-pointer"
              title="Buka Navigasi"
              aria-label="Buka Navigasi"
            >
              <Menu size={18} />
            </button>

            <span className="text-xs font-semibold uppercase tracking-wider text-label-tertiary hidden sm:inline">
              E-Rapor SMP Al-Hidayah
            </span>
            <span className="text-label-tertiary hidden sm:inline">&bull;</span>
            <span className="text-sm font-semibold text-label truncate max-w-[170px] sm:max-w-none">
              {activePageTitle}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme Toggle (Dark/Light) */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-separator hover:bg-fill text-label-secondary transition-colors"
              title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              aria-label="Toggle Tema"
            >
              {theme === 'dark' ? (
                <Sun size={16} className="text-amber-400" />
              ) : (
                <Moon size={16} className="text-slate-600" />
              )}
            </button>

            {/* User Chip */}
            <div className="flex items-center gap-2 pl-2 border-l border-separator/60">
              <div className="w-7 h-7 rounded-full bg-primary-subtle border border-primary-border text-primary font-bold text-xs flex items-center justify-center">
                {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-medium text-label leading-tight truncate max-w-[140px]">
                  {userEmail}
                </span>
                <span className="text-[10px] text-label-secondary leading-tight">
                  {formatRoleLabel(userRole)}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Konten Halaman */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Slide-Over Drawer Navigation */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-[280px] max-w-[85vw] bg-card h-full flex flex-col p-4 shadow-2xl border-r border-separator z-10 animate-in slide-in-from-left duration-200">
            {/* Header Drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-separator/60 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                  <School size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-label leading-tight">
                    SMP AL-HIDAYAH
                  </h2>
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                    {formatRoleLabel(userRole)}
                  </span>
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

            {/* Nav Menu */}
            <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className={`flex items-center gap-3 h-10 px-3 rounded-lg transition-colors text-sm ${
                      isActive
                        ? 'bg-primary text-white font-medium shadow-sm'
                        : 'text-label-secondary hover:text-label hover:bg-fill font-normal'
                    }`}
                  >
                    <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.75} className="shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Footer Drawer (User & Logout) */}
            <div className="pt-3 border-t border-separator/60 mt-auto flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1 py-1">
                <div className="w-7 h-7 rounded-full bg-primary-subtle border border-primary-border text-primary font-bold text-xs flex items-center justify-center shrink-0">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-label truncate">
                    {userEmail}
                  </span>
                  <span className="text-[10px] text-label-secondary">
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
                <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
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
