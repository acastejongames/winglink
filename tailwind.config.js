/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#101D30',
          50: '#EAF0F8',
          100: '#D5E1F0',
          200: '#AABFE0',
          300: '#7F9DCC',
          400: '#5479B3',
          500: '#1C3552',
          600: '#183049',
          700: '#14283E',
          800: '#101D30',
          900: '#0B1522',
          950: '#060D16',
        },
        sky: {
          DEFAULT: '#70C8FF',
          50: '#EAF8FF',
          100: '#D5F0FF',
          200: '#ABE1FF',
          300: '#70C8FF',
          400: '#3DB4FF',
          500: '#0F9AEB',
          600: '#0A7ABD',
        },
        cloud: {
          DEFAULT: '#F1F5F9',
          50: '#FAFBFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk Variable"', 'Space Grotesk', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(6, 13, 22, 0.06), 0 4px 16px rgba(6, 13, 22, 0.06)',
        'card-hover': '0 2px 4px rgba(6, 13, 22, 0.08), 0 12px 32px rgba(6, 13, 22, 0.12)',
        glow: '0 0 24px rgba(112, 200, 255, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.21, 1.02, 0.73, 1)',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.21, 1.02, 0.73, 1)',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.72' },
        },
      },
    },
  },
  plugins: [],
}
