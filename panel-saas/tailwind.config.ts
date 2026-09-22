import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0F0E1A', 2: '#6E6B7B', 3: '#9A97A8', 4: '#C4C2CF' },
        page: '#F7F7FA',
        line: '#ECEBF1',
        brand: { pink: '#d000a8', red: '#ff2455', blue: '#0879ff' },
        ok: '#22C55E',
        danger: '#E11D48',
        trial: '#0879ff',
        paused: '#9A97A8',
        warn: '#F59E0B',
      },
      borderRadius: {
        card: '18px',
        field: '16px',
        pill: '99px',
      },
      fontFamily: {
        sans: ['var(--font-sora)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['26px', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '700' }],
      },
      backgroundImage: {
        grad: 'linear-gradient(90deg, #ff2455, #d000a8, #0879ff)',
        'grad-br': 'linear-gradient(135deg, #ff2455, #d000a8, #0879ff)',
      },
      boxShadow: {
        brand: '0 8px 22px rgba(208,0,168,.25)',
        menu: '0 20px 60px rgba(15,14,26,.16)',
      },
    },
  },
  plugins: [],
} satisfies Config;
