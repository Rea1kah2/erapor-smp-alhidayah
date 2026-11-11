// frontend/src/app/components/GlassModal.tsx
'use client';
import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
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
      color: 'text-primary',
      bg: 'bg-primary-subtle border-primary-border'
    },
    danger: {
      icon: AlertTriangle,
      color: 'text-[var(--status-fail)]',
      bg: 'bg-[var(--status-fail-bg)] border-[var(--status-fail-border)]'
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/15 border-amber-500/30'
    },
    info: {
      icon: Info,
      color: 'text-primary',
      bg: 'bg-primary-subtle border-primary-border'
    },
    confirm: {
      icon: HelpCircle,
      color: 'text-primary',
      bg: 'bg-primary-subtle border-primary-border'
    }
  }[type];

  const IconComponent = iconConfig.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-card p-6 rounded-2xl border border-separator shadow-xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 relative"
      >
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-fill text-label-secondary transition-colors"
            title="Tutup"
          >
            <X size={18} />
          </button>
        )}

        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl border ${iconConfig.bg} ${iconConfig.color} shrink-0 mt-0.5`}>
            <IconComponent size={22} strokeWidth={2} />
          </div>

          <div className="flex-1 pr-4">
            <h3 className="text-base font-bold text-label leading-tight">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-label-secondary mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {(onCancel || onConfirm) && (
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-separator">
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg hover:bg-fill text-label-secondary font-medium text-xs transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            )}

            {onConfirm && (
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg font-medium text-xs shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer ${
                  type === 'danger'
                    ? 'bg-[var(--status-fail)] text-white hover:opacity-95'
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
              >
                {isLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                )}
                <span>{confirmLabel}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
