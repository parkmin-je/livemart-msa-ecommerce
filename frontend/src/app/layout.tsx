import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR, Bebas_Neue } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AiChatbot } from './_components/AiChatbot.client';
import { WebVitals } from './_components/WebVitals.client';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  display: 'swap',
  variable: '--font-noto',
});

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-bebas',
});

export const metadata: Metadata = {
  title: {
    default: 'LiveMart — 프리미엄 쇼핑몰 | 로켓배송',
    template: '%s | LiveMart',
  },
  description: '인기 상품을 최저가로! 오늘 주문하면 내일 도착하는 빠른 배송 서비스. 전자기기, 패션, 식품, 뷰티까지 모든 것을 LiveMart에서.',
  keywords: ['쇼핑몰', '온라인쇼핑', '최저가', '로켓배송', 'LiveMart', '라이브마트'],
  authors: [{ name: 'LiveMart' }],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'LiveMart',
    title: 'LiveMart — 프리미엄 쇼핑몰',
    description: '인기 상품을 최저가로! 빠른 배송 서비스',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E8001D' },
    { media: '(prefers-color-scheme: dark)', color: '#0F0F0F' },
  ],
};

// Dark mode 초기화 스크립트 — FOUC 방지 (SSR에서 실행)
const darkModeScript = `
(function() {
  try {
    var stored = localStorage.getItem('livemart-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} ${bebasNeue.variable}`}>
      <head>
        {/* Dark mode 초기화 — FOUC(Flash of Unstyled Content) 방지 */}
        <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
      </head>
      <body className={notoSansKR.className} style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <WebVitals />
        <Providers>{children}</Providers>
        <AiChatbot />
      </body>
    </html>
  );
}
