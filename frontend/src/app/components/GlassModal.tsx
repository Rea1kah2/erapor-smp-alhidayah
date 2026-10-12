'use client';
import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  XCircle, 
  HelpCircle,
  X 
} from 'lucide-react';

export type ModalType = 'success' | 'danger' | 'warning' | 'info' | 'confirm';

interface GlassModalProps {
  isOpen: boolean;
  type?: ModalType;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function GlassModal({
  isOpen,
  type = 'info',
  title,
  description,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  isLoading = false
}: GlassModalProps) {
  if (!isOpen) return null;

  const iconConfig = {
    success: {
      icon: CheckCircle2,
      color: 'text-[var(--green)]',
      bg: 'bg-[var(--green)]/15 border-[var(--green)]/30'
    },
    danger: {
      icon: AlertTriangle,
      color: 'text-[var(--red)]',
      bg: 'bg-[var(--red)]/15 border-[var(--red)]/30'
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/15 border-amber-500/30'
    },
    info: {
      icon: Info,
      color: 'text-accent',
      bg: 'bg-accent/15 border-accent/30'
    },
    confirm: {
      icon: HelpCircle,
      color: 'text-accent',
      bg: 'bg-accent/15 border-accent/30'
    }
  }[type];

  const IconComponent = iconConfig.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md glass glass-thick p-6 rounded-[28px] shadow-2xl border border-separator/40 flex flex-col gap-4 animate-in zoom-in-95 duration-200 relative"
        style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}
      >
        {/* Tombol Close silang jika ada onCancel */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-fill text-label-secondary transition-colors"
            title="Tutup"
          >
            <X size={18} />
          </button>
        )}

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl border ${iconConfig.bg} ${iconConfig.color} shrink-0`}>
            <IconComponent size={26} strokeWidth={2.2} />
          </div>

          <div className="flex-1 pr-6">
            <h3 className="text-lg font-bold text-label leading-tight">
              {title}
            </h3>
            <p className="text-sm text-label-secondary mt-1.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-separator/20">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-full hover:bg-fill text-label-secondary font-medium text-sm transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          )}

          {onConfirm && (
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 ${
                type === 'danger'
                  ? 'bg-[var(--red)] text-white hover:opacity-95'
                  : 'glass glass-accent text-white'
              }`}
            >
              {isLoading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              )}
              <span>{confirmLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
