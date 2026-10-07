import { NextResponse } from 'next/server';

export async function POST(request) {
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(new URL('/admin/login/', origin));
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
// step0-rebuild-marker
