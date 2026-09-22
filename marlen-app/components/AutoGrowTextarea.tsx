'use client';

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

/** Crece con el texto: evita un scroll dentro del recuadro que recorta la nota. */
export default function AutoGrowTextarea({
  value, className, ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      {...rest}
      ref={ref}
      rows={3}
      value={value}
      className={`${className ?? ''} overflow-hidden`}
    />
  );
}
