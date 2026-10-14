import { NextResponse } from 'next/server';

async function computeAdminToken() {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(process.env.ADMIN_PASSWORD || ''),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(process.env.ADMIN_EMAIL || ''));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function isProtected(pathname) {
  if (pathname.startsWith('/admin/') && !pathname.startsWith('/admin/login')) return true;
  if (pathname === '/admin') return true;
  if (pathname.startsWith('/api/admin/')) return true;
  // Legacy unauthenticated write/generation endpoints (unused by the site UI).
  // Gate them behind admin auth so they cannot be invoked publicly.
  if (pathname.startsWith('/api/generate-question')) return true;
  if (pathname.startsWith('/api/save-question')) return true;
  if (pathname.startsWith('/api/generate-ideas')) return true;
  return false;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (isProtected(pathname)) {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login/', request.url));
    }
    const expected = await computeAdminToken();
    if (token !== expected) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL('/admin/login/', request.url));
      response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
      return response;
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/bible-verses-about-')) {
    const withSlash = pathname.endsWith('/') ? pathname : pathname + '/';
    const slug = withSlash.slice(1, -1);
    const url = request.nextUrl.clone();
    url.pathname = '/bible-verses/' + slug + '/';
    return NextResponse.redirect(url, { status: 301 });
  }

  if (!pathname.endsWith('/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname + '/';
    return NextResponse.redirect(url, { status: 301 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
// step0-rebuild-marker
