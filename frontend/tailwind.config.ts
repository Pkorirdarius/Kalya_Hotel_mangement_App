import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#0B3B2E',
          dark: '#06251B',
          light: '#175844',
          50: '#F2F7F3',
          100: '#DCEBE1',
        },
        gold: {
          DEFAULT: '#C99A4B',
          deep: '#8A5C14',
          soft: '#F6EBD4',
          pale: '#FBF5E8',
        },
        cream: '#FBF9F4',
        sand: '#F2ECE1',
        ink: '#18251F',
        muted: '#58655E',
        line: '#E3DCCD',
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 50px -28px rgba(6, 37, 27, 0.28)',
        lift: '0 26px 70px -34px rgba(6, 37, 27, 0.35)',
      },
      maxWidth: {
        '8xl': '88rem',
      },
      animation: {
        'fade-up': 'fadeUp 300ms ease-out both',
        'fade-in': 'fadeIn 300ms ease-out both',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
