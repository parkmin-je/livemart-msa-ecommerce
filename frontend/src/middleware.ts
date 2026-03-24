/**
 * Next.js Edge Middleware — 서버 사이드 인증 라우트 보호
 *
 * 문제: 기존에는 클라이언트 컴포넌트에서 localStorage.role을 읽어 페이지 진입 후
 * redirect했기 때문에 인증되지 않은 사용자에게 레이아웃이 잠깐 노출될 수 있었음.
 *
 * 해결: Edge Runtime에서 httpOnly 쿠키를 읽어 토큰 존재 여부와 role을 확인,
 * 라우트 접근 전 서버 측에서 차단.
 *
 * 보호 규칙:
 *  - /admin/** → role=ADMIN 필요
 *  - /seller/** → role=SELLER 또는 ADMIN 필요
 *  - /profile, /orders, /wishlist 등 → 로그인 필요 (role 무관)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** 로그인 필요 경로 (prefix 매칭) */
const AUTH_REQUIRED_PATHS = [
  '/profile',
  '/orders',
  '/wishlist',
  '/checkout',
  '/payment',
  '/my',
];

/** ADMIN 전용 경로 */
const ADMIN_PATHS = ['/admin'];

/** SELLER 이상 경로 — /seller는 클라이언트에서 판매자 등록 랜딩 표시를 위해 제외 */
const SELLER_PATHS: string[] = [];

/** JWT payload 디코딩 (서명 검증 없이 claims만 읽음 — Edge Runtime에서 crypto 제약) */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64URL → Base64 변환
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 정적 파일, API 라우트, Next.js 내부 경로는 패스
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ── 보호 여부 판단 ──────────────────────────────────────────────
  const needsAuth =
    AUTH_REQUIRED_PATHS.some(p => pathname.startsWith(p)) ||
    ADMIN_PATHS.some(p => pathname.startsWith(p)) ||
    SELLER_PATHS.some(p => pathname.startsWith(p));

  if (!needsAuth) {
    return NextResponse.next();
  }

  // ── 토큰 추출 (httpOnly 쿠키 우선, 없으면 Authorization 헤더) ──
  const tokenFromCookie = request.cookies.get('access_token')?.value;
  const tokenFromHeader = request.headers.get('authorization')?.replace('Bearer ', '');
  const token = tokenFromCookie ?? tokenFromHeader;

  // 토큰 없음 → 로그인 페이지로
  if (!token) {
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── JWT payload에서 role 추출 ────────────────────────────────
  const payload = decodeJwtPayload(token);

  // 만료 확인
  if (payload?.exp && typeof payload.exp === 'number') {
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSec) {
      const loginUrl = new URL('/auth', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('reason', 'expired');
      return NextResponse.redirect(loginUrl);
    }
  }

  const role =
    (payload?.role as string) ??
    (payload?.authorities as string[])?.find(a => a.startsWith('ROLE_'))?.replace('ROLE_', '') ??
    'USER';

  // ── ADMIN 경로 보호 ─────────────────────────────────────────
  if (ADMIN_PATHS.some(p => pathname.startsWith(p))) {
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ── SELLER 경로 보호 ────────────────────────────────────────
  if (SELLER_PATHS.some(p => pathname.startsWith(p))) {
    if (role !== 'SELLER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  /*
   * matcher: 정적 파일/_next 제외하고 모든 페이지 경로에 적용
   * 참고: middleware는 Edge Runtime에서 실행되므로 Node.js API 사용 불가
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
