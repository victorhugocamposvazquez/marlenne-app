import type { Config } from 'tailwindcss';

// Los valores viven como variables CSS en app/globals.css (claro/oscuro).
const t = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        v: {
          DEFAULT: t('--c-brand'),
          2: t('--c-brand-2'),
          d: t('--c-brand-deep'),
          soft: t('--c-brand-soft'),
          tint: t('--c-brand-tint'),
        },
        ink: { DEFAULT: t('--c-ink'), 2: t('--c-ink-2'), 3: t('--c-ink-3') },
        surface: { bg: t('--c-bg'), card: t('--c-card'), line: t('--c-line') },
        grid: { h: t('--c-grid-h'), v: t('--c-grid-v') },
        track: t('--c-track'),
        handle: t('--c-handle'),
        ok: {
          DEFAULT: t('--c-ok'),
          fg: t('--c-ok-fg'),
          strong: t('--c-ok-strong'),
          bg: t('--c-ok-bg'),
          line: t('--c-ok-line'),
        },
        danger: {
          DEFAULT: t('--c-danger'),
          fg: t('--c-danger-fg'),
          bg: t('--c-danger-bg'),
          line: t('--c-danger-line'),
        },
        warn: { fg: t('--c-warn-fg'), bg: t('--c-warn-bg'), line: t('--c-warn-line') },
        toast: { DEFAULT: t('--c-toast-bg'), fg: t('--c-toast-fg'), accent: t('--c-toast-accent') },
      },
      backgroundImage: {
        grad: 'linear-gradient(100deg,#8B5CF6,#A855F7)',
        'grad-160': 'linear-gradient(160deg,#8B5CF6,#A855F7)',
        block:
          'repeating-linear-gradient(-45deg,rgb(var(--c-stripe-a)),rgb(var(--c-stripe-a)) 6px,rgb(var(--c-stripe-b)) 6px,rgb(var(--c-stripe-b)) 12px)',
      },
      boxShadow: {
        card: '0 4px 20px rgba(20,10,60,.07)',
        lift: '0 12px 28px rgba(20,10,60,.14)',
        toast: '0 18px 44px rgba(20,10,60,.22)',
        drag: '0 18px 44px rgba(20,10,60,.30)',
        btn: '0 10px 24px rgba(139,92,246,.42)',
        pill: '0 8px 20px rgba(139,92,246,.34)',
        hero: '0 14px 34px rgba(139,92,246,.32)',
        nav: '0 -6px 24px rgba(20,10,60,.08)',
        seg: '0 3px 10px rgba(20,10,60,.12)',
      },
      borderRadius: {
        sheet: '28px',
        card: '20px',
        row: '18px',
        field: '16px',
        pill: '15px',
        icon: '13px',
        chip: '11px',
        badge: '9px',
      },
      fontSize: {
        micro: ['10.5px', { lineHeight: '1.35' }],
        caption: ['11.5px', { lineHeight: '1.4' }],
        label: ['12.5px', { lineHeight: '1.4' }],
        body: ['14px', { lineHeight: '1.45' }],
        'body-lg': ['15px', { lineHeight: '1.45' }],
        title: ['19px', { lineHeight: '1.25' }],
        h1: ['23px', { lineHeight: '1.15' }],
        display: ['30px', { lineHeight: '1.1' }],
      },
      fontFamily: { sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'] },
      keyframes: {
        sheetUp: { from: { transform: 'translateY(30px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        toastIn: { from: { transform: 'translateY(10px) scale(.97)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.35' } },
      },
      animation: {
        sheetUp: 'sheetUp .26s cubic-bezier(.2,.9,.3,1)',
        toastIn: 'toastIn .22s ease',
        pulseDot: 'pulseDot 1.6s infinite',
      },
    },
  },
} satisfies Config;
