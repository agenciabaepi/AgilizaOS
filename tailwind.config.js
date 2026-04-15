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
    },
  },
  plugins: [],
} 