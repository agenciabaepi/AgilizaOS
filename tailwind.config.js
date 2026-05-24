/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Canvas principal: modo escuro mais profundo (contraste com texto zinc-50) */
        canvas: {
          DEFAULT: '#ffffff',
          dark: '#09090b',
        },
        surface: {
          DEFAULT: '#fafafa',
          dark: '#18181b',
        },
        'surface-elevated': {
          DEFAULT: '#ffffff',
          dark: '#27272a',
        },
      },
      keyframes: {
        'nova-os-fade-slide': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'nova-os-fade-slide': 'nova-os-fade-slide 0.35s ease-out',
      },
    },
  },
  plugins: [],
} 