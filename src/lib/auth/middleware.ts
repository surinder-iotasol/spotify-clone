/**
 * Middleware utilities — pure helpers extracted from middleware.ts
 *
 * These functions are unit-testable and silently executed by
 * the Edge middleware at request time.
 */

import type { JwtPayload } from '@/lib/auth/token'

/** Role hierarchy: higher index ⇒ more privileges. */
const ROLE_HIERARCHY: Record<string, number> = {
  LISTENER: 0,
  ARTIST: 1,
  ADMIN: 2,
}

/** Routes that require ADMIN role only. */
const ADMIN_ROUTES = ['/admin', '/api/v1/admin']

/** Routes that require at least ARTIST role. */
const ARTIST_ROUTES = ['/api/v1/artist', '/api/v1/playlists', '/api/v1/reports']

// ───────── pure helpers ──────────────────────────────────────────────

/** Return `true` when the pathname belongs to a protected route. */
export function shouldProtectRoute(pathname: string): boolean {
  const allProtected = [...ARTIST_ROUTES, ...ADMIN_ROUTES]
  return allProtected.some((prefix) => isPrefixMatch(pathname, prefix))
}

/** Match `prefix` at the start of `pathname` — must be exact or followed by `/`. */
function isPrefixMatch(pathname: string, prefix: string): boolean {
  if (!pathname.startsWith(prefix)) return false
  const after = pathname[prefix.length]
  // match `prefix` exactly, or `prefix` followed by `/`
  return after === undefined || after === '/'
}

/**
 * Return the minimum required role for `pathname`, or `undefined`
 * when the path has no role constraint.
 */
export function getRequiredRole(pathname: string): string | undefined {
  if (ADMIN_ROUTES.some((prefix) => isPrefixMatch(pathname, prefix))) {
    return 'ADMIN'
  }
  if (ARTIST_ROUTES.some((prefix) => isPrefixMatch(pathname, prefix))) {
    return 'ARTIST'
  }
  return undefined
}

/**
 * True when `userRole` satisfies at least the `requiredRole` tier.
 *
 * e.g. hasRoleAccess('ADMIN', 'ARTIST') → `true`
 */
export function hasRoleAccess(
  userRole: string,
  requiredRole: string,
): boolean {
  return (
    (ROLE_HIERARCHY[userRole] ?? -1) >= (ROLE_HIERARCHY[requiredRole] ?? -1)
  )
}

/** Build a lightweight payload proxy from the raw request cookie. */
export function extractJwtPayload(
  token: string,
): JwtPayload | undefined {
  try {
    const [payloadB64] = token.split('.')
    if (!payloadB64) return undefined
    const raw = Buffer.from(payloadB64, 'base64').toString('utf-8')
    const json = JSON.parse(raw)
    if (!json.userId || !json.role) return undefined
    return json as JwtPayload
  } catch {
    return undefined
  }
}

/** Return header entries that carry decoded identity claims. */
export function createAuthHeaders(payload: JwtPayload): Map<string, string> {
  const headers = new Map<string, string>()
  headers.set('x-user-id', payload.userId)
  headers.set('x-user-role', payload.role)
  if (payload.artistProfileId) {
    headers.set('x-artist-profile-id', payload.artistProfileId)
  }
  return headers
}

// ───────── types re-exported for consumers ───────────────────────────

export type { JwtPayload }
