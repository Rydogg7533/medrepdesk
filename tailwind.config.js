/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EBF2F8',
          100: '#D7E5F1',
          200: '#AFCBE3',
          300: '#87B1D5',
          400: '#5F97C7',
          500: '#377DB9',
          600: '#2C6494',
          700: '#214B6F',
          800: '#0F4C81',
          900: '#0A3358',
        },
        status: {
          scheduled: '#6366F1',
          confirmed: '#8B5CF6',
          completed: '#10B981',
          'bill-sheet': '#F59E0B',
          'po-requested': '#F97316',
          billed: '#3B82F6',
          'po-received': '#06B6D4',
          paid: '#22C55E',
          cancelled: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}
