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
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
      },
    },
  },
  plugins: [],
};


