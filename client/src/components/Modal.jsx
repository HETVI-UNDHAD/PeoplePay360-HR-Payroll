import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-2xl', slideFromRight = false }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className={`fixed inset-0 z-50 flex bg-slate-950/80 backdrop-blur-sm ${slideFromRight ? 'justify-end' : 'items-center justify-center p-4 overflow-y-auto'}`}>
        <div className={`relative w-full ${slideFromRight ? `max-w-md h-full border-l animate-in slide-in-from-right duration-200` : `${maxWidth} my-8 rounded-2xl animate-in fade-in zoom-in-95 duration-150`} glass-panel bg-slate-900/95 border border-slate-700/60 shadow-2xl overflow-hidden`}>
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-theme">
            <div>
              <h3 className="text-lg font-semibold text-primary">{title}</h3>
              {subtitle && <p className="text-xs text-secondary mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-secondary hover:text-primary rounded-lg hover:bg-elevated transition-colors theme-transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className={`px-6 py-5 overflow-y-auto ${slideFromRight ? 'h-[calc(100vh-81px)]' : 'max-h-[75vh]'}`}>
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
