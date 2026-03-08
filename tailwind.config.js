/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'rgb(var(--app-accent-rgb, 15 76 129) / 0.06)',
          100: 'rgb(var(--app-accent-rgb, 15 76 129) / 0.12)',
          200: 'rgb(var(--app-accent-rgb, 15 76 129) / 0.2)',
          300: 'rgb(var(--app-accent-rgb, 15 76 129) / 0.35)',
          400: 'rgb(var(--app-accent-light-rgb, 95 151 199) / <alpha-value>)',
          500: 'rgb(var(--app-accent-rgb, 15 76 129) / 0.75)',
          600: 'rgb(var(--app-accent-dark-rgb, 44 100 148) / <alpha-value>)',
          700: 'rgb(var(--app-accent-dark-rgb, 33 75 111) / <alpha-value>)',
          800: 'rgb(var(--app-accent-rgb, 15 76 129) / <alpha-value>)',
          900: 'rgb(var(--app-accent-rgb, 15 76 129) / 0.95)',
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
        outfit: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left': 'env(safe-area-inset-left, 0px)',
        'safe-right': 'env(safe-area-inset-right, 0px)',
      },
      minHeight: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}
