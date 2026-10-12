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
  UserCheck
} from 'lucide-react';
import GlassModal from '../components/GlassModal';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string>('ADMIN');

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('siakad_token');
    const role = localStorage.getItem('siakad_role') || 'ADMIN';
    if (!token) {
      router.push('/');
    } else {
      setUserRole(role.toUpperCase());
    }
  }, [router]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = () => {
    localStorage.removeItem('siakad_token');
    localStorage.removeItem('siakad_role');
    setShowLogoutModal(false);
    router.push('/');
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // Navigasi dinamis berdasarkan role pengguna
  const navItems = useMemo(() => {
    const items = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'GURU', 'SISWA', 'ORTU'] },
      { name: 'Guru', href: '/dashboard/guru', icon: GraduationCap, roles: ['ADMIN'] },
      { name: 'Siswa', href: '/dashboard/siswa', icon: Users, roles: ['ADMIN', 'GURU'] },
      { name: 'Akademik', href: '/dashboard/akademik', icon: BookOpen, roles: ['ADMIN'] },
      { name: 'Input Nilai', href: '/dashboard/nilai', icon: FileSpreadsheet, roles: ['ADMIN', 'GURU'] },
      { name: 'Rekap & Wali', href: '/dashboard/wali', icon: Award, roles: ['ADMIN', 'GURU'] },
      { name: 'Rapor Saya', href: '/dashboard/rapor', icon: Award, roles: ['SISWA', 'ORTU'] },
    ];

    return items.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row pb-24 md:pb-0">
      
      {/* Sidebar Desktop */}
      <aside 
        className={`hidden md:flex flex-col h-[calc(100vh-48px)] sticky top-6 glass glass-thick m-6 p-2 z-40 transition-all duration-300 ease-in-out shrink-0 ${
          isCollapsed ? 'w-[88px]' : 'w-[280px]'
        }`} 
        style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}
      >
        <div className={`p-4 mb-3 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div>
              <h2 className="text-xl font-bold text-label whitespace-nowrap overflow-hidden transition-all duration-300">
                E-RAPOR<span className="text-accent">.</span>
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-medium text-label-secondary">SMP Al-Hidayah</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]"></span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-fill text-label-secondary tracking-wide uppercase">
                  {userRole}
                </span>
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-full hover:bg-fill text-label-secondary transition-colors shrink-0"
            aria-label={isCollapsed ? 'Perlebar Sidebar' : 'Ciutkan Sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center min-h-[44px] px-3 rounded-md transition-colors ${
                  isCollapsed ? 'justify-center mx-1' : 'gap-3'
                } ${
                  isActive 
                    ? 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent font-medium' 
                    : 'text-label hover:bg-fill'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon size={20} strokeWidth={isActive ? 2 : 1.75} className="shrink-0" aria-hidden="true" />
                
                <span className={`text-[16px] whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                  isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'
                }`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-2 border-t-[0.5px] border-separator overflow-x-hidden">
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center min-h-[44px] px-3 rounded-md text-red hover:bg-fill transition-colors text-[16px] ${
              isCollapsed ? 'justify-center mx-1' : 'gap-3'
            }`}
            title={isCollapsed ? 'Keluar' : undefined}
          >
            <LogOut size={20} strokeWidth={1.75} className="shrink-0" />
            
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
              isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'
            }`}>
              Keluar
            </span>
          </button>
        </div>
      </aside>
      
      {/* Konten Utama */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-6 md:pl-0 transition-all duration-300">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="absolute inset-0 -top-6 bg-gradient-to-t from-bg to-transparent pointer-events-none -z-10"></div>
        <nav 
          className="glass flex items-center p-1.5 mx-auto max-w-md shadow-lg" 
          style={{ '--glass-radius': 'var(--radius-full)' } as React.CSSProperties}
          aria-label="Navigasi utama"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center min-h-[52px] gap-1 relative"
              >
                {isActive && (
                  <span className="absolute inset-0 bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] rounded-full -z-10"></span>
                )}
                <item.icon size={22} strokeWidth={1.75} className={isActive ? 'text-accent' : 'text-label-secondary'} aria-hidden="true" />
                <span className={`text-[10px] leading-none ${isActive ? 'text-accent font-semibold' : 'text-label-secondary font-medium'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Dialog Konfirmasi Keluar (Logout Modal) */}
      <GlassModal
        isOpen={showLogoutModal}
        type="confirm"
        title="Konfirmasi Keluar"
        description="Apakah Anda yakin ingin keluar dari sistem E-Rapor SMP Al-Hidayah? Sesi akun Anda akan diakhiri."
        confirmLabel="Ya, Keluar"
        cancelLabel="Batal"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

    </div>
  );
}