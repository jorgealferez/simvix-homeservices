import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Identidad del grupo «simvix.» (ADR 0008): un solo color propio, el coral del punto.
        // primary = tinta (#0B1220 en 700) y grises fríos; accent = coral (#FF5A3C en 500,
        // #D23A1A en 600 para botones con texto blanco: 4,8:1 sobre blanco, AA).
        primary: {
          50: '#F5F6F8',
          100: '#E8EAEE',
          200: '#CDD1D9',
          300: '#A3AAB8',
          400: '#6B7385',
          500: '#3F4759',
          600: '#1F2737',
          700: '#0B1220',
          800: '#080D18',
          900: '#050810',
        },
        accent: {
          50: '#FFF1EE',
          100: '#FFE0D9',
          200: '#FFC2B3',
          300: '#FF9A85',
          400: '#FF7A60',
          500: '#FF5A3C',
          600: '#D23A1A',
          700: '#B02E12',
          800: '#8A240E',
          900: '#5E190A',
        },
        ink: '#0B1220',
        coral: { DEFAULT: '#FF5A3C', strong: '#D23A1A' },
        // Tokens semánticos del design system /obras.
        // Cada par {DEFAULT, dark} se referencia con bg-surface / dark:bg-surface-dark, etc.
        // Usar las clases utilitarias normales de Tailwind cubre la mayoría de casos.
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
