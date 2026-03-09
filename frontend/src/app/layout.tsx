import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LiveMart — 최저가 쇼핑몰 | 로켓배송',
  description: '인기 상품을 최저가로! 오늘 주문하면 내일 도착하는 빠른 배송 서비스',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={notoSansKR.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
