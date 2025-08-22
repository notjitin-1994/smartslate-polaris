/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand primary (Teal/Cyan)
        primary: {
          400: '#d0edf0',
          500: '#a7dadb',
          600: '#7bc5c7',
        },
        // Brand secondary (Indigo/Purple)
        secondary: {
          400: '#7C69F5',
          500: '#4F46E5',
          600: '#3730A3',
        },
        // Utility alias for emphasis/selection overlays
        brand: {
          accent: '#a7dadb',
        },
      },
      fontFamily: {
        sans: ['Lato', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Quicksand', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-in-up': 'fadeInUp 300ms ease-out',
        'scale-in': 'scaleIn 220ms cubic-bezier(0.22,1,0.36,1)',
        'slide-in': 'slideIn 240ms ease-out',
        'slide-in-right': 'slideInRight 280ms cubic-bezier(0.22,1,0.36,1)',
        shimmer: 'shimmer 1.8s linear infinite',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};


