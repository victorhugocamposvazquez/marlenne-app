'use client';

import { useEffect, useRef } from 'react';
import { FORMAT_SIZES } from '@/lib/marketing/styles';
import { drawCreative } from '@/lib/marketing/draw';
import type {
  CreativePayload,
  MarketingBrand,
  MarketingFormat,
  MarketingStyleId,
} from '@/lib/marketing/types';

export default function CreativeCanvas({
  styleId,
  format,
  brand,
  payload,
  logo,
  className,
}: {
  styleId: MarketingStyleId;
  format: MarketingFormat;
  brand: MarketingBrand;
  payload: CreativePayload;
  logo: HTMLImageElement | null;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = FORMAT_SIZES[format];

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCreative(ctx, { styleId, format, brand, payload, logo });
  }, [styleId, format, brand, payload, logo, size.w, size.h]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ aspectRatio: `${size.w} / ${size.h}` }}
      aria-label="Vista previa de la creatividad"
    />
  );
}
