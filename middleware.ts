import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, parseAuthCookie, JwtPayload } from '@/lib/auth/token'

/** Environments where auth checks are skipped (e.g. health checks). */
const PUBLIC_PATHS = ['/health']

/**
 * Next.js Edge Middleware.
 *
 * Intercepts `/admin/*` and `/api/v1/admin/*` routes.
 * - Unauthenticated requests → HTTP 401 `UNAUTHENTICATED`
 * - Non-admin requests       → HTTP 403 `FORBIDDEN_INSUFFICIENT_ROLE`
 * - Valid admin requests      → passes through with identity headers injected
 */
export async function middleware(
  request: NextRequest,
): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // Public paths bypass auth checks
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next()
  }

  // Only protect admin routes
  const isAdminRoute =
    pathname.startsWith('/admin') || pathname.startsWith('/api/v1/admin')
  if (!isAdminRoute) {
    return NextResponse.next()
  }

  // --- Extract & verify session ---

  const rawCookie = request.headers.get('cookie')
  const token = parseAuthCookie(rawCookie ?? '')

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 401, message: 'UNAUTHENTICATED' },
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
      { status: 401 },
    )
  }

  let payload: JwtPayload

  try {
    payload = await verifyToken(token)
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: 401, message: 'UNAUTHENTICATED' },
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
      { status: 401 },
    )
  }

  // --- Role-based access control ---

  if (payload.role !== 'ADMIN') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 403,
          message: 'FORBIDDEN_INSUFFICIENT_ROLE',
          details: [`Role "${payload.role}" requires ADMIN access`],
        },
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
      { status: 403 },
    )
  }

  // --- Pass-through with identity headers ---

  const response = NextResponse.next()
  response.headers.set('x-user-id', payload.userId)
  response.headers.set('x-user-role', payload.role)
  if (payload.artistProfileId) {
    response.headers.set('x-artist-profile-id', payload.artistProfileId)
  }

  return response
}

/** Generate a unique request ID for response correlation. */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Route matcher — only run middleware on admin paths.
 */
export const config = {
  matcher: ['/admin/:path*', '/api/v1/admin/:path*'],
}
