import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secure-secret-key-mediasoft-2026');

// Specify which routes should be protected
const protectedRoutes = ['/', '/api-docs'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the current route is protected
  const isProtected = protectedRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`) && route !== '/');
  
  if (isProtected) {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // Verify token
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch (error) {
      // Token is invalid or expired
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }
  }

  // Allow access to public routes (like /login and /api/* calls for integrations)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
