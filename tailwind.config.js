/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-pink': '#9e3754',
        'brand-dark': '#531332',
        'brand-light': '#d183a9',
        'brand-header': '#841c4f',
        'brand-yellow': '#fada5b',
        'product-bg': '#ffea99',
      },
      backgroundImage: {
        'sidebar-gradient': 'linear-gradient(314deg, rgb(204, 100, 150) 2%, rgb(189, 84, 135) 13%, rgb(87, 20, 52) 75%, rgb(37, 4, 20) 97%)',
        'header-gradient': 'linear-gradient(90deg, rgba(71,15,42,1) 0%, rgba(157,61,105,1) 22%, rgba(171,95,133,1) 50%, rgba(133,29,79,1) 76%, rgba(71,15,42,1) 100%)',
      },
      fontFamily: {
        'goudy': ['OFL_Sorts_Mill_Goudy_TT', 'serif'],
        'satoshi': ['Satoshi', 'sans-serif'],
      },
      flex: {
        '3': '3 3 0%'
      },
      keyframes: {
        slowZoom: {
          'from': { transform: 'scale(1)' },
          'to': { transform: 'scale(1.04)' },
        },
        fadeUp: {
          'from': { 
            opacity: '0',
            transform: 'translateY(24px)'
          },
          'to': { 
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        floatNav: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(3px)' },
        },
      },
      animation: {
        slowZoom: 'slowZoom 18s ease-in-out infinite alternate',
        fadeUp: 'fadeUp 1.2s ease-out forwards',
        fadeIn: 'fadeIn 1s ease-out',
        floatNav: 'floatNav 6s ease-in-out infinite',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      })
    },
  ],
}

