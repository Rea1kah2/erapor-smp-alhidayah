// frontend/src/lib/glass.ts
const KEY = 'glass-intensity';

export function applyGlassIntensity(value: number) {
  const v = Math.min(1, Math.max(0, value));
  document.documentElement.style.setProperty('--glass-intensity', String(v));
  try {
    localStorage.setItem(KEY, String(v));
  } catch {}
}

export function restoreGlassIntensity() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved !== null) applyGlassIntensity(parseFloat(saved));
  } catch {}
}

/**
 * Framed Sheet design tokens & surface helpers ("Academic Heritage").
 * Flat 1px-bordered surfaces, zero resting drop shadows, and tabular numeral alignment.
 */
export const sheetPanel =
  'bg-card rounded-xl border border-separator';

export const sheetWell =
  'bg-card-subtle rounded-xl border border-separator';

export const sheetInput =
  'h-9 px-3 rounded-lg bg-bg-secondary border border-separator-strong text-sm text-label placeholder:text-label-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors duration-150';

export const sheetSelect =
  'h-9 px-3 rounded-lg bg-bg-secondary border border-separator-strong text-xs sm:text-sm font-medium text-label focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors duration-150 cursor-pointer';

export const sheetButtonPrimary =
  'h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-medium transition-colors duration-150 inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer';

export const sheetButtonSecondary =
  'h-9 px-3.5 rounded-lg bg-bg-secondary hover:bg-card-subtle border border-separator-strong text-label text-xs sm:text-sm font-medium transition-colors duration-150 inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer';

export const sheetBadge =
  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary-subtle border border-primary-border text-primary';
