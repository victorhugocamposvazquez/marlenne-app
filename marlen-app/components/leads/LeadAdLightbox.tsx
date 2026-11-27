'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import LeadAdPicture from '@/components/leads/LeadAdPicture';

export default function LeadAdLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const gesturing = useRef(false);

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      pinchRef.current = { dist: d, scale };
      dragRef.current = null;
      gesturing.current = true;
    } else if (e.touches.length === 1 && scale > 1) {
      dragRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        px: pos.x,
        py: pos.y,
      };
      gesturing.current = true;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      setScale(Math.min(4, Math.max(1, pinchRef.current.scale * (d / pinchRef.current.dist))));
    } else if (e.touches.length === 1 && dragRef.current && scale > 1) {
      e.preventDefault();
      setPos({
        x: dragRef.current.px + (e.touches[0].clientX - dragRef.current.x),
        y: dragRef.current.py + (e.touches[0].clientY - dragRef.current.y),
      });
    }
  };

  const onTouchEnd = () => {
    pinchRef.current = null;
    dragRef.current = null;
    gesturing.current = false;
    setScale(current => {
      if (current <= 1.05) {
        reset();
        return 1;
      }
      return current;
    });
  };

  const onDoubleClick = () => {
    if (scale > 1.05) reset();
    else setScale(2);
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-ink/75 backdrop-blur-sm" role="dialog" aria-modal>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-[2] flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
        aria-label="Cerrar"
      >
        <X size={22} strokeWidth={2.4} />
      </button>
      <p className="pointer-events-none absolute inset-x-0 top-[max(3.25rem,env(safe-area-inset-top))] z-[2] text-center text-[12px] font-medium text-white/80">
        Pellizca o doble toque para zoom
      </p>
      <div
        className="relative z-[1] flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden p-4"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onDoubleClick={onDoubleClick}
      >
        <LeadAdPicture
          src={src}
          className="max-h-[min(82dvh,900px)] max-w-full select-none"
          style={{
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${scale})`,
            transition: gesturing.current ? 'none' : 'transform 0.15s ease-out',
          }}
        />
      </div>
    </div>
  );
}