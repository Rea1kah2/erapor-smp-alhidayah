// frontend/src/app/dashboard/guru/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GuruRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/manajemen?tab=guru_mapel');
  }, [router]);

  return (
    <div className="w-full h-[50vh] flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-xs text-label-secondary">Mengarahkan ke panel Guru di Manajemen Akun...</p>
    </div>
  );
}
