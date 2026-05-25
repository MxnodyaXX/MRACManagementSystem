/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#E8EFF8',
        navy: {
          50:  '#E8EFF8',
          100: '#C5D5EC',
          200: '#9FBADE',
          300: '#6B9FE4',
          400: '#4B7BE5',
          500: '#2B5CC8',
          600: '#1B3A8A',
          700: '#1B2B6B',
          800: '#132054',
          900: '#0D1640',
        },
        card: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 16px rgba(27,43,107,0.08)',
        'card-hover': '0 4px 24px rgba(27,43,107,0.14)',
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.5rem',
      },
    },
  },
  plugins: [],
}
