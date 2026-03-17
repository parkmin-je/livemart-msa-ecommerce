/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#E8001D',
          'red-hover': '#C4001A',
          'red-dim': 'rgba(232,0,29,0.08)',
          dark: '#0A0A0A',
          'dark-2': '#141414',
          'dark-3': '#1E1E1E',
          cream: '#F7F6F1',
          'cream-2': '#F0EEE7',
          'cream-3': '#E8E5DB',
          warm: '#3A3530',
        },
        lm: {
          // LiveMart design tokens
          bg: '#F7F6F1',
          surface: '#FFFFFF',
          border: '#E0DDD4',
          'border-2': '#EDEAE3',
          text: '#0E0E0E',
          'text-2': '#3A3A3A',
          'text-3': '#6E6E6E',
          'text-4': '#AEAEAE',
        },
      },
      fontFamily: {
        sans: ['var(--font-noto)', 'system-ui', 'sans-serif'],
        display: ['var(--font-bebas)', 'Impact', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        marquee: 'marquee 28s linear infinite',
        'marquee-fast': 'marquee 16s linear infinite',
        'marquee-slow': 'marquee 40s linear infinite',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fadeIn 0.4s ease both',
        float: 'float 5s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
        'ping-once': 'pingOnce 0.6s cubic-bezier(0,0,0.2,1) forwards',
        'badge-pop': 'badgePop 0.35s cubic-bezier(0.175,0.885,0.32,1.275) both',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.22,1,0.36,1) both',
        'dropdown-open': 'dropdownOpen 0.22s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.175,0.885,0.32,1.275) both',
        wiggle: 'wiggle 0.4s ease-in-out',
        'price-flip': 'priceFlip 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'stagger-1': 'fadeUp 0.6s 0.05s cubic-bezier(0.22,1,0.36,1) both',
        'stagger-2': 'fadeUp 0.6s 0.1s cubic-bezier(0.22,1,0.36,1) both',
        'stagger-3': 'fadeUp 0.6s 0.15s cubic-bezier(0.22,1,0.36,1) both',
        'stagger-4': 'fadeUp 0.6s 0.2s cubic-bezier(0.22,1,0.36,1) both',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-600px 0' },
          '100%': { backgroundPosition: '600px 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        pingOnce: {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '80%': { transform: 'scale(2.2)', opacity: '0' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        badgePop: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        dropdownOpen: {
          '0%': { opacity: '0', transform: 'translateY(-10px) scaleY(0.92)', transformOrigin: 'top' },
          '100%': { opacity: '1', transform: 'translateY(0) scaleY(1)', transformOrigin: 'top' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.88)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-5deg)' },
          '75%': { transform: 'rotate(5deg)' },
        },
        priceFlip: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'card': '0 1px 4px rgba(0,0,0,0.05)',
        'card-hover': '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        'card-warm': '0 4px 20px rgba(58,53,48,0.10)',
        'glow-red': '0 0 24px rgba(232,0,29,0.30)',
        'glow-red-sm': '0 0 12px rgba(232,0,29,0.20)',
        'mega': '0 20px 60px rgba(0,0,0,0.16)',
        'nav': '0 1px 0 rgba(0,0,0,0.06)',
        'float': '0 16px 48px rgba(0,0,0,0.14)',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'shimmer-light': 'linear-gradient(90deg, #F0EEE7 0%, #E8E5DB 50%, #F0EEE7 100%)',
        'shimmer-white': 'linear-gradient(90deg, #f8f8f8 0%, #ececec 50%, #f8f8f8 100%)',
        'hero-noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
        'cream-gradient': 'linear-gradient(180deg, #F7F6F1 0%, #EEEAE0 100%)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
        snappy: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      spacing: {
        'nav-h': '148px',
      },
    },
  },
  plugins: [],
};
