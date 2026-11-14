/** @type {import('tailwindcss').Config} */
/** ESCHOOL design tokens */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#142B52', 700: '#1B3A6B', 600: '#24477F' },
        brand: { DEFAULT: '#2563EB', dark: '#1D4ED8', soft: '#E8EFFD' },
        teal: { DEFAULT: '#14B8A6', dark: '#0F9488', soft: '#DDF6F3' },
        amber: { DEFAULT: '#D97706', soft: '#FEF1DC' },
        violet: { DEFAULT: '#7C3AED', soft: '#EFE8FD' },
        surface: '#F8FAFC',
        line: '#E2E8F0',
        ink: { DEFAULT: '#0F1F3D', muted: '#5B6B84' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '14px', control: '10px' },
      boxShadow: { card: '0 1px 2px rgba(20,43,82,.06)' },
    },
  },
  plugins: [],
};

