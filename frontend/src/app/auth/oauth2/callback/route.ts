import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth2 크로스 도메인 콜백 핸들러
 *
 * 백엔드(ngrok 등 외부 URL)와 프론트엔드(Vercel)가 다른 도메인일 때,
 * httpOnly 쿠키를 올바른 도메인(Vercel)에 설정하기 위한 중간 라우트.
 *
 * 설정:
 *   user-service의 OAUTH2_REDIRECT_URI=https://{vercel-url}/auth/oauth2/callback
 *
 * 흐름:
 *   백엔드 OAuth2 성공 → 이 라우트로 redirect (token, userId, name, role 포함)
 *   → Vercel 도메인에 access_token 쿠키 설정
 *   → /auth/callback?userId=...&name=...&role=... 으로 redirect
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const token        = searchParams.get('token');
  const refreshToken = searchParams.get('refreshToken');
  const userId       = searchParams.get('userId');
  const name         = searchParams.get('name');
  const role         = searchParams.get('role');
  const needOnboarding = searchParams.get('needOnboarding');
  const error        = searchParams.get('error');

  // 에러 처리
  if (error || !token || !userId) {
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('error', error ?? 'oauth2_failed');
    return NextResponse.redirect(loginUrl);
  }

  // 비민감 정보를 /auth/callback 으로 전달 (token은 제외)
  const callbackUrl = new URL('/auth/callback', request.url);
  if (userId)       callbackUrl.searchParams.set('userId', userId);
  if (name)         callbackUrl.searchParams.set('name', name);
  if (role)         callbackUrl.searchParams.set('role', role);
  if (needOnboarding) callbackUrl.searchParams.set('needOnboarding', needOnboarding);

  const response = NextResponse.redirect(callbackUrl);

  // access_token을 이 도메인(Vercel)의 httpOnly 쿠키로 설정
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = 60 * 60 * 24 * 30; // 30일

  response.cookies.set('access_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge,
    path: '/',
  });

  if (refreshToken) {
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 60, // 60일
      path: '/api/users/refresh',
    });
  }

  return response;
}
