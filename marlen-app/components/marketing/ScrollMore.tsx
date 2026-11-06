'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import css from './marketing.module.css';
import { Icon, PATH } from './Icons';

const END_SLACK = 12;

/** Zona con scroll que avisa de que hay más opciones debajo. */
export default function ScrollMore({ style, children }: { style?: React.CSSProperties; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollHeight - el.clientHeight - el.scrollTop > END_SLACK);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    const mo = new MutationObserver(() => {
      Array.from(el.children).forEach((c) => ro.observe(c));
      check();
    });
    mo.observe(el, { childList: true, subtree: true });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [check]);

  const scrollDown = () => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ top: Math.max(120, el.clientHeight * 0.7), behavior: 'smooth' });
  };

  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div ref={ref} onScroll={check} style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', ...style }}>
        {children}
      </div>
      <div aria-hidden={!more} className={css.scrollMore} data-on={more ? '' : undefined}>
        <button type="button" tabIndex={more ? 0 : -1} onClick={scrollDown} className={css.scrollMoreBtn}>
          Más abajo<Icon d={PATH.chevronDown} size={15} stroke={2.4} />
        </button>
      </div>
    </div>
  );
}
