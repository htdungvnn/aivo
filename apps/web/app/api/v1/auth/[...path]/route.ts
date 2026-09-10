/**
 * Auth API Proxy Routes
 * Proxies all auth requests to the auth service
 *
 * Route mapping:
 * - /api/v1/auth/auth/* → /auth/* (current user, refresh, logout)
 * - /api/v1/auth/oauth/* → /oauth/* (OAuth flows)
 * - /api/v1/auth/login/* → /login/* (login)
 * - /api/v1/auth/register → /register (registration)
 * - /api/v1/auth/sessions/* → /sessions/* (session management)
 * - /api/v1/auth/account/* → /account/* (account management)
 */

import { NextRequest, NextResponse } from 'next/server';

// Get the auth service URL from environment
function getAuthServiceUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_AUTH_API_URL;

  if (envUrl) {
    return envUrl;
  }

  // Fallback to localhost
  return process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
}

/**
 * Build target URL for auth service
 * Handles the route mapping correctly based on the path
 */
function buildTargetUrl(authServiceUrl: string, path: string[]): string {
  const firstSegment = path[0];

  // OAuth routes: /api/v1/auth/oauth/* → /oauth/*
  if (firstSegment === 'oauth') {
    return `${authServiceUrl}/oauth/${path.slice(1).join('/')}`;
  }

  // Session management: /api/v1/auth/sessions/* → /sessions/*
  if (firstSegment === 'sessions') {
    return `${authServiceUrl}/sessions/${path.slice(1).join('/')}`;
  }

  // Account management: /api/v1/auth/account/* → /account/*
  if (firstSegment === 'account') {
    return `${authServiceUrl}/account/${path.slice(1).join('/')}`;
  }

  // Login routes: /api/v1/auth/login/* → /login/*
  if (firstSegment === 'login') {
    return `${authServiceUrl}/login/${path.slice(1).join('/')}`;
  }

  // Register route: /api/v1/auth/register → /register
  if (firstSegment === 'register') {
    return `${authServiceUrl}/register`;
  }

  // Verification routes: /api/v1/auth/verification/* → /verification/*
  if (firstSegment === 'verification') {
    return `${authServiceUrl}/verification/${path.slice(1).join('/')}`;
  }

  // Admin routes: /api/v1/auth/admin/* → /admin/*
  if (firstSegment === 'admin') {
    return `${authServiceUrl}/admin/${path.slice(1).join('/')}`;
  }

  // Auth routes: /api/v1/auth/auth/* → /auth/*
  // These include: me, refresh, logout
  if (firstSegment === 'auth') {
    return `${authServiceUrl}/auth/${path.slice(1).join('/')}`;
  }

  // Default: assume it's an auth route
  return `${authServiceUrl}/auth/${path.join('/')}`;
}

/**
 * Forward cookies from request to auth service
 */
function forwardCookies(request: NextRequest): string {
  const cookies = request.headers.get('Cookie') || '';
  return cookies;
}

/**
 * Forward Set-Cookie headers from response
 */
function forwardSetCookieHeaders(response: Response): Headers {
  const headers = new Headers();

  const setCookieHeaders = response.headers.getSetCookie();
  for (const cookie of setCookieHeaders) {
    headers.append('Set-Cookie', cookie);
  }

  return headers;
}

/**
 * Handle fetch response and parse JSON
 */
async function parseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }

  // Non-JSON response (error page, redirect, etc.)
  const text = await response.text();
  try {
    // Try to parse as JSON anyway
    return JSON.parse(text);
  } catch {
    return {
      error: {
        code: 'PROXY_ERROR',
        message: text || 'Invalid response from auth service',
      },
    };
  }
}

/**
 * Handle all auth API GET requests
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  try {
    const authServiceUrl = getAuthServiceUrl();
    const targetUrl = buildTargetUrl(authServiceUrl, path) + request.nextUrl.search;

    const authHeader = request.headers.get('Authorization') || '';
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Cookie': forwardCookies(request),
      },
      credentials: 'include',
      redirect: 'follow',
    });

    const data = await parseResponse(response);
    const responseHeaders = forwardSetCookieHeaders(response);

    return new NextResponse(JSON.stringify(data), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Auth proxy GET error:', error);
    return NextResponse.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Auth service is unavailable' } },
      { status: 503 }
    );
  }
}

/**
 * Handle all auth API POST requests
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  try {
    const authServiceUrl = getAuthServiceUrl();
    const targetUrl = buildTargetUrl(authServiceUrl, path) + request.nextUrl.search;

    // Get the request body
    const body = await request.json();

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': forwardCookies(request),
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const data = await parseResponse(response);
    const responseHeaders = forwardSetCookieHeaders(response);

    return new NextResponse(JSON.stringify(data), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Auth proxy POST error:', error);
    return NextResponse.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Auth service is unavailable' } },
      { status: 503 }
    );
  }
}

/**
 * Handle all auth API PUT requests
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  try {
    const authServiceUrl = getAuthServiceUrl();
    const targetUrl = buildTargetUrl(authServiceUrl, path) + request.nextUrl.search;

    const body = await request.json();

    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': forwardCookies(request),
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const data = await parseResponse(response);
    const responseHeaders = forwardSetCookieHeaders(response);

    return new NextResponse(JSON.stringify(data), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Auth proxy PUT error:', error);
    return NextResponse.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Auth service is unavailable' } },
      { status: 503 }
    );
  }
}

/**
 * Handle all auth API DELETE requests
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  try {
    const authServiceUrl = getAuthServiceUrl();
    const targetUrl = buildTargetUrl(authServiceUrl, path) + request.nextUrl.search;

    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': forwardCookies(request),
      },
      credentials: 'include',
    });

    const data = await parseResponse(response);
    const responseHeaders = forwardSetCookieHeaders(response);

    return new NextResponse(JSON.stringify(data), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Auth proxy DELETE error:', error);
    return NextResponse.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Auth service is unavailable' } },
      { status: 503 }
    );
  }
}
