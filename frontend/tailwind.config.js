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
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        brand: {
          red: '#DC2626',
          'red-hover': '#B91C1C',
          'red-light': '#FEF2F2',
          dark: '#09090B',
          'dark-2': '#18181B',
          'dark-3': '#27272A',
        },
      },
      fontFamily: {
        // Pretendard는 한국어 최고 품질 폰트 — CDN 사용 시 추가
        sans: ['Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        // 기존
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.5s ease-out',
        // 신규 — 스켈레톤 shimmer
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        // 신규 — 마키 텍스트 스크롤
        marquee: 'marquee 22s linear infinite',
        'marquee-slow': 'marquee 38s linear infinite',
        // 신규 — 페이드+업 복합
        'fade-up': 'fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both',
        'fade-up-sm': 'fadeUpSm 0.4s cubic-bezier(0.22,1,0.36,1) both',
        // 신규 — 부유 효과
        float: 'float 4s ease-in-out infinite',
        // 신규 — 부드러운 맥박
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
        // 신규 — 링 확산
        'ping-once': 'pingOnce 0.6s cubic-bezier(0,0,0.2,1) forwards',
        // 신규 — 배지 팝
        'badge-pop': 'badgePop 0.35s cubic-bezier(0.175,0.885,0.32,1.275) both',
        // 신규 — 버튼 슬라이드인
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.22,1,0.36,1) both',
        // 신규 — 헤더 드롭다운
        'dropdown-open': 'dropdownOpen 0.25s cubic-bezier(0.22,1,0.36,1) both',
        // 신규 — 스케일 팝
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.175,0.885,0.32,1.275) both',
        // 신규 — 진동
        wiggle: 'wiggle 0.4s ease-in-out',
        // 신규 — 좌우 스윙
        'swing-in': 'swingIn 0.45s cubic-bezier(0.175,0.885,0.32,1.275) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-600px 0' },
          '100%': { backgroundPosition: '600px 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUpSm: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        pingOnce: {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '80%': { transform: 'scale(2)', opacity: '0' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        badgePop: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        dropdownOpen: {
          '0%': { opacity: '0', transform: 'translateY(-8px) scaleY(0.9)', transformOrigin: 'top' },
          '100%': { opacity: '1', transform: 'translateY(0) scaleY(1)', transformOrigin: 'top' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-6deg)' },
          '75%': { transform: 'rotate(6deg)' },
        },
        swingIn: {
          '0%': { opacity: '0', transform: 'rotateX(-15deg) translateY(-10px)' },
          '100%': { opacity: '1', transform: 'rotateX(0deg) translateY(0)' },
        },
      },
      boxShadow: {
        'card-hover': '0 8px 30px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        'glow-red': '0 0 20px rgba(220,38,38,0.35)',
        'glow-red-sm': '0 0 10px rgba(220,38,38,0.25)',
        'mega': '0 16px 48px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)',
        'nav': '0 1px 0 rgba(0,0,0,0.06)',
        'float': '0 12px 40px rgba(0,0,0,0.12)',
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
        'shimmer-dark': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
        'card-gradient': 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.04) 100%)',
        'hero-noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'smooth': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
