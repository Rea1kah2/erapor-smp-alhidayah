'use client';
import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  glassIntensity: number;
  setGlassIntensity: (intensity: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
let themeSnapshot: Theme = 'light';
let glassIntensitySnapshot = 0.5;
const subscribers = new Set<() => void>();

function subscribe(listener: () => void) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

function notifySubscribers() {
  subscribers.forEach((listener) => listener());
}

function getThemeSnapshot() { return themeSnapshot; }
function getGlassIntensitySnapshot() { return glassIntensitySnapshot; }
function getServerThemeSnapshot(): Theme { return 'light'; }
function getServerGlassIntensitySnapshot() { return 0.5; }

function applyTheme(theme: Theme) {
  themeSnapshot = theme;
  document.documentElement.setAttribute('data-theme', theme);
  notifySubscribers();
}

function applyGlassIntensity(value: number) {
  glassIntensitySnapshot = Math.min(1, Math.max(0, value));
  document.documentElement.style.setProperty('--glass-intensity', String(glassIntensitySnapshot));
  notifySubscribers();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, getServerThemeSnapshot);
  const glassIntensity = useSyncExternalStore(subscribe, getGlassIntensitySnapshot, getServerGlassIntensitySnapshot);

  useEffect(() => {
    // 1. Pulihkan tema
    const savedTheme = localStorage.getItem('siakad_theme') as Theme | null;
    const initialTheme: Theme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(initialTheme);

    // 2. Pulihkan intensitas kaca
    const savedIntensity = localStorage.getItem('glass-intensity');
    const intensityVal = savedIntensity !== null ? parseFloat(savedIntensity) : 0.5;
    applyGlassIntensity(Number.isFinite(intensityVal) ? intensityVal : 0.5);
  }, []);

  const setTheme = (newTheme: Theme) => {
    applyTheme(newTheme);
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
    applyGlassIntensity(clamped);
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
