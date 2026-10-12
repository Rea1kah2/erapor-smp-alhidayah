'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  glassIntensity: number;
  setGlassIntensity: (intensity: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [glassIntensity, setGlassIntensityState] = useState<number>(0.5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Pulihkan tema
    const savedTheme = localStorage.getItem('siakad_theme') as Theme | null;
    const initialTheme: Theme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setThemeState(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    // 2. Pulihkan intensitas kaca
    const savedIntensity = localStorage.getItem('glass-intensity');
    const intensityVal = savedIntensity !== null ? parseFloat(savedIntensity) : 0.5;
    setGlassIntensityState(intensityVal);
    document.documentElement.style.setProperty('--glass-intensity', String(intensityVal));

    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      localStorage.setItem('siakad_theme', newTheme);
    } catch {}
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const setGlassIntensity = (val: number) => {
    const clamped = Math.min(1, Math.max(0.0, val));
    setGlassIntensityState(clamped);
    document.documentElement.style.setProperty('--glass-intensity', String(clamped));
    try {
      localStorage.setItem('glass-intensity', String(clamped));
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, glassIntensity, setGlassIntensity }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
