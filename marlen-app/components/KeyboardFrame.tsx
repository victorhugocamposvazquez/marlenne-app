'use client';

import { useEffect } from 'react';
import { keyboardBox } from '@/lib/keyboard-inset';

const FIELD = 'input:not([type=button]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=hidden]):not([type=submit]):not([type=reset]):not([type=image]):not([type=color]), textarea, select, [contenteditable="true"]';

function isField(el: EventTarget | null) {
  return el instanceof HTMLElement && el.matches(FIELD);
}

/** Safari no encoge el layout. Medimos el teclado y lo dejamos en dos variables. */
export default function KeyboardFrame() {
  useEffect(() => {
    const root = document.documentElement;

    const paint = () => {
      const vv = window.visualViewport;
      const box = keyboardBox(
        window.innerHeight,
        vv?.height ?? window.innerHeight,
        vv?.offsetTop ?? 0,
        isField(document.activeElement),
      );
      root.style.setProperty('--keyboard-inset', `${box.inset}px`);
      root.style.setProperty('--keyboard-top', `${box.top}px`);
    };

    const onFocus = () => {
      paint();
      requestAnimationFrame(paint);
      window.setTimeout(paint, 320);
    };

    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onFocus);
    window.visualViewport?.addEventListener('resize', paint);
    window.visualViewport?.addEventListener('scroll', paint);
    return () => {
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onFocus);
      window.visualViewport?.removeEventListener('resize', paint);
      window.visualViewport?.removeEventListener('scroll', paint);
      root.style.removeProperty('--keyboard-inset');
      root.style.removeProperty('--keyboard-top');
    };
  }, []);

  return null;
}
