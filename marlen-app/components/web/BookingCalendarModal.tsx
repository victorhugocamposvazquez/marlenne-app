'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  onClose: () => void;
  embedUrl: string;
  title?: string;
  accent?: string;
  onAccent?: string;
  ink?: string;
  bg?: string;
};

export default function BookingCalendarModal({
  open,
  onClose,
  embedUrl,
  title = 'Reservar cita',
  accent = '#0F0E1A',
  onAccent = '#fff',
  ink = '#0F0E1A',
  bg = '#fff',
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(15,14,26,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(920px, 100%)',
          height: 'min(860px, 100%)',
          maxHeight: '100%',
          background: bg,
          color: ink,
          borderRadius: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 28px 80px rgba(15,14,26,0.35)',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            height: 52,
            padding: '0 12px 0 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            borderBottom: '1px solid rgba(15,14,26,0.08)',
          }}
        >
          <strong style={{ fontSize: 15, fontWeight: 700 }}>{title}</strong>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              border: 'none',
              borderRadius: 12,
              background: accent,
              color: onAccent,
              fontSize: 22,
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <iframe
          title={title}
          src={embedUrl}
          style={{ flex: 1, width: '100%', border: 'none', background: bg }}
        />
      </div>
    </div>,
    document.body,
  );
}
