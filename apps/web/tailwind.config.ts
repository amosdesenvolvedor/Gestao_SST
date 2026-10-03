import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          500: '#14b8a6',
          700: '#0f766e',
          900: '#134e4a',
        },
      },
      boxShadow: {
        panel: '0 12px 30px -18px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
}

export default config