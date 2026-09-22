import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0F0E1A', 2: '#6E6B7B' },
        page: '#F7F7FA',
        brand: { pink: '#d000a8', red: '#ff2455', blue: '#0879ff' },
      },
      fontFamily: {
        sans: ['var(--font-sora)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        grad: 'linear-gradient(90deg, #ff2455, #d000a8, #0879ff)',
      },
    },
  },
  plugins: [],
} satisfies Config;
