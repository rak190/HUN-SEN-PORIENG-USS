'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  headerBg?: string;
  headerRight?: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  closeOnOutsideClick?: boolean;
  closeOnEsc?: boolean;
}

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-[96vw] h-[92vh]',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size = '2xl',
  headerBg,
  headerRight,
  showCloseButton = true,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  closeOnOutsideClick = true,
  closeOnEsc = true,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen || !mounted) return null;

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES['2xl'];

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/45 backdrop-blur-md animate-overlayFade select-none"
      onClick={closeOnOutsideClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${sizeClass} bg-white rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-100/80 overflow-hidden flex flex-col max-h-[90vh] relative animate-modalScale ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        {(title || icon || showCloseButton) && (
          <div
            className={`px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 flex items-center justify-between shrink-0 ${
              headerBg || 'bg-white'
            } ${headerClassName}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {icon && (
                <div className="shrink-0 flex items-center justify-center">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                  title="បិទ (Close)"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
