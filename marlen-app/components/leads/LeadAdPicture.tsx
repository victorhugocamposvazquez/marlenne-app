'use client';

import { useState, type CSSProperties } from 'react';
import { enlargeFbCdnUrl } from '@/lib/meta-lead-creative';

/** Pide el recorte grande del CDN y, si Facebook lo rechaza, vuelve a la URL guardada. */
export default function LeadAdPicture({
  src,
  className,
  style,
}: {
  src: string;
  className?: string;
  style?: CSSProperties;
}) {
  const sharp = enlargeFbCdnUrl(src);
  const [current, setCurrent] = useState(sharp && sharp !== src ? sharp : src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt=""
      draggable={false}
      className={className}
      style={style}
      onError={() => {
        if (current !== src) setCurrent(src);
      }}
    />
  );
}
