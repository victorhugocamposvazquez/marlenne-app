import type { Config } from 'tailwindcss';

// Tokens tomados del prototipo Marlenne.dc.html
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        v: { DEFAULT: '#8B5CF6', 2: '#A855F7', d: '#6D28D9', soft: '#EDE9FE', tint: '#F5F3FF' },
        ink: { DEFAULT: '#1B1830', 2: '#635E80', 3: '#9B96B8' },
        surface: { bg: '#EEECFA', card: '#FFFFFF', line: '#EFEDF8' },
        grid: { h: '#E1DDF2', v: '#DDD8EF' },
        track: '#E4E0F5',
        handle: '#D6D1EB',
      },
      backgroundImage: {
        grad: 'linear-gradient(100deg,#8B5CF6,#A855F7)',
        'grad-160': 'linear-gradient(160deg,#8B5CF6,#A855F7)',
        block: 'repeating-linear-gradient(-45deg,#E7E3F5,#E7E3F5 6px,#EFECF9 6px,#EFECF9 12px)',
      },
      boxShadow: {
        card: '0 4px 20px rgba(60,40,120,.07)',
        lift: '0 12px 28px rgba(60,40,120,.13)',
        toast: '0 18px 44px rgba(60,40,120,.18)',
        drag: '0 18px 44px rgba(60,40,120,.28)',
        btn: '0 10px 24px rgba(139,92,246,.42)',
        pill: '0 8px 20px rgba(139,92,246,.34)',
        hero: '0 14px 34px rgba(139,92,246,.32)',
        nav: '0 -6px 24px rgba(60,40,120,.06)',
        seg: '0 3px 10px rgba(60,40,120,.12)',
      },
      borderRadius: { sheet: '28px', card: '20px', row: '18px', pill: '15px', field: '16px', chip: '11px' },
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
