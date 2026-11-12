'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface AcademicYearContextValue {
  semester: string;         // 'GANJIL' | 'GENAP'
  tahunAjaran: string;      // e.g. '2025/2026'
  yearOptions: string[];    // ['2024/2025', '2025/2026']
  setSemester: (s: string) => void;
  setTahunAjaran: (t: string) => void;
  isLoading: boolean;
  refreshYears: () => Promise<void>;
}

const AcademicYearContext = createContext<AcademicYearContextValue | undefined>(undefined);

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [semester, setSemester] = useState<string>('GANJIL');
  const [tahunAjaran, setTahunAjaran] = useState<string>('');
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchYears = useCallback(async () => {
    try {
      const res = await apiFetch('/api/master/tahun-ajaran');
      if (res.ok) {
        const years: Array<{ id: string; nama: string; aktif: boolean }> = await res.json();
        const opts = years.map((y) => y.nama);
        setYearOptions(opts);
        const active = years.find((y) => y.aktif)?.nama;
        if (active) {
          setTahunAjaran(active);
        } else if (opts.length > 0) {
          setTahunAjaran(opts[0]);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data tahun ajaran global:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchYears();
    });
  }, [fetchYears]);

  const value = useMemo(
    () => ({
      semester,
      tahunAjaran,
      yearOptions,
      setSemester,
      setTahunAjaran,
      isLoading,
      refreshYears: fetchYears,
    }),
    [semester, tahunAjaran, yearOptions, isLoading, fetchYears]
  );

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return ctx;
}
