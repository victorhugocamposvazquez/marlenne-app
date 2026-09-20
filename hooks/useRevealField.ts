'use client';

import { useEffect, type RefObject } from 'react';

function visibleBottom() {
  const vv = window.visualViewport;
  if (!vv) return window.innerHeight;
  return vv.offsetTop + vv.height;
}

function scrollParent(node: HTMLElement, root: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = node;
  while (el && el !== root.parentElement) {
    const style = getComputedStyle(el);
    if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 8) {
      return el;
    }
    el = el.parentElement;
  }
  return root;
}

/** Lleva el campo al hueco visible. El panel no se mueve: solo el scroll interno. */
export function revealFieldInView(field: HTMLElement, root: HTMLElement) {
  const pad = 18;
  const box = field.getBoundingClientRect();
  const bottom = visibleBottom();
  const overflow = box.bottom + pad - bottom;
  if (overflow <= 4 && box.top >= pad) return;
  const scroller = scrollParent(field, root);
  if (!scroller) return;
  scroller.scrollTop += overflow > 0 ? overflow : 0;
}

export function useRevealField(rootRef: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;

    let timer = 0;
    const run = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return;
      if (!t.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (!root.contains(t)) return;
      window.clearTimeout(timer);
      const go = () => revealFieldInView(t, root);
      requestAnimationFrame(() => requestAnimationFrame(go));
      timer = window.setTimeout(go, 180);
    };

    const onFocus = (e: FocusEvent) => run(e.target);
    root.addEventListener('focusin', onFocus);
    return () => {
      root.removeEventListener('focusin', onFocus);
      window.clearTimeout(timer);
    };
  }, [rootRef, enabled]);
}
