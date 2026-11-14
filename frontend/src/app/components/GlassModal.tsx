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
      color: 'text-[var(--status-pass)]',
      bg: 'bg-[var(--status-pass-bg)] border-[var(--status-pass-border)]'
    },
    danger: {
      icon: AlertTriangle,
      color: 'text-[var(--status-fail)]',
      bg: 'bg-[var(--status-fail-bg)] border-[var(--status-fail-border)]'
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-[var(--status-dirty)]',
      bg: 'bg-[var(--status-dirty-bg)] border-[var(--status-dirty-border)]'
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
    <div
      data-ui="modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-card p-6 rounded-2xl border border-separator flex flex-col gap-4 animate-in zoom-in-95 duration-150 relative">
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-fill text-label-secondary transition-colors cursor-pointer"
            title="Tutup"
            aria-label="Tutup dialog"
          >
            <X size={18} />
          </button>
        )}

        <div className="flex items-start gap-3.5">
          <div className={`p-2 rounded-lg border ${iconConfig.bg} ${iconConfig.color} shrink-0 mt-0.5`}>
            <IconComponent size={20} strokeWidth={2} />
          </div>

          <div className="flex-1 pr-4">
            <h3 className="text-base font-semibold text-label leading-tight">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-label-secondary mt-1.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {(onCancel || onConfirm) && (
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-separator">
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="h-9 px-4 rounded-lg border border-separator hover:bg-card-subtle text-label-secondary font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cancelLabel}
              </button>
            )}

            {onConfirm && (
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`h-9 px-4 rounded-lg font-medium text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer ${
                  type === 'danger'
                    ? 'bg-[var(--status-fail)] text-white hover:opacity-90'
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
              >
                {isLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
