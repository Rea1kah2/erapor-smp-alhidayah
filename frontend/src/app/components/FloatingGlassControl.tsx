'use client';
import React, { useState } from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { Sun, Moon, Sliders, X, Sparkles } from 'lucide-react';

export default function FloatingGlassControl() {
  const { theme, toggleTheme, glassIntensity, setGlassIntensity } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-50 print:hidden flex flex-col items-end gap-2">
      {/* Floating Action Button */}
      <div className="flex items-center gap-1.5 p-1 rounded-full glass shadow-lg backdrop-blur-md border border-separator/40">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-fill text-label transition-all active:scale-90"
          title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          aria-label="Toggle Tema"
        >
          {theme === 'dark' ? (
            <Sun size={17} className="text-amber-400 animate-pulse" />
          ) : (
            <Moon size={17} className="text-slate-700" />
          )}
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-full transition-all active:scale-90 ${
            isOpen ? 'bg-accent text-white' : 'hover:bg-fill text-label-secondary'
          }`}
          title="Pengaturan Ketebalan Kaca (Liquid Glass)"
          aria-label="Pengaturan Liquid Glass"
        >
          <Sliders size={17} />
        </button>
      </div>

      {/* Floating Glass Settings Popup */}
      {isOpen && (
        <div 
          className="w-72 glass glass-thick p-4 rounded-[24px] shadow-2xl border border-separator/50 flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between border-b border-separator/30 pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={15} className="text-accent" />
              <span className="text-xs font-bold text-label uppercase tracking-wider">
                Liquid Glass Settings
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-fill text-label-secondary transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-label-secondary">Mode Tampilan</span>
            <div className="inline-flex p-1 rounded-full bg-fill/50 border border-separator/30">
              <button
                onClick={() => theme !== 'light' && toggleTheme()}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  theme === 'light' ? 'bg-bg text-label shadow-sm' : 'text-label-tertiary'
                }`}
              >
                <Sun size={13} className="text-amber-500" />
                <span>Light</span>
              </button>
              <button
                onClick={() => theme !== 'dark' && toggleTheme()}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  theme === 'dark' ? 'bg-bg-secondary text-label shadow-sm' : 'text-label-tertiary'
                }`}
              >
                <Moon size={13} className="text-indigo-400" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Slider Ketebalan Kaca */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-label-secondary">
                Ketebalan Efek Kaca
              </span>
              <span className="text-xs font-mono font-bold text-accent">
                {Math.round(glassIntensity * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={glassIntensity}
              onChange={(e) => setGlassIntensity(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent)] cursor-pointer h-1.5 rounded-lg bg-fill"
            />

            <div className="flex justify-between text-[10px] text-label-tertiary font-medium">
              <span>Bening (0%)</span>
              <span>Transparan</span>
              <span>Pekat (100%)</span>
            </div>
          </div>

          {/* Visual Glass Preview Card */}
          <div className="p-2.5 rounded-[16px] glass flex items-center justify-between text-xs border border-separator/20">
            <span className="text-label font-medium text-[11px]">Pratinjau Kaca</span>
            <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-bold">
              {glassIntensity > 0.7 ? 'High Frost' : glassIntensity < 0.3 ? 'Ultra Clear' : 'Balanced'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
