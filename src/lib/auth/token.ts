import { SignJWT, jwtVerify } from 'jose'

/** HTTP-only session cookie name (__Host- prefix ensures strict security). */
export const SESSION_COOKIE = '__Host-indie_session'

/** 7-day session in seconds (604800). */
const SESSION_MAX_AGE = 604800

/** Secret for signing JWTs — read from `JWT_SECRET` environment variable. */
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }
  return new TextEncoder().encode(secret)
}

// --- Types ---

export interface JwtPayload {
  userId: string
  role: 'LISTENER' | 'ARTIST' | 'ADMIN'
  artistProfileId?: string
  iat: number
  exp: number
}

/**
 * Generate a 7-day stateless JWT session token.
 *
 * @param userId    — unique identifier of the authenticated user
 * @param role      — user role (LISTENER, ARTIST, or ADMIN)
 * @param artistProfileId — optional artist profile reference
 * @returns A compact JWS (dot-separated) token string
 */
export async function generateToken(
  userId: string,
  role: 'LISTENER' | 'ARTIST' | 'ADMIN',
  artistProfileId?: string,
): Promise<string> {
  const secret = getSecret()
  return new SignJWT({ userId, role, artistProfileId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret)
}

/**
 * Verify and decode a JWT session token.
 *
 * @param token — A compact JWS token string
 * @returns The decoded payload with `userId`, `role`, `iat`, `exp`
 * @throws Error if the token is missing, expired, or tampered
 */
export async function verifyToken(
  token: string,
): Promise<JwtPayload> {
  const secret = getSecret()
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
  })
  return payload as unknown as JwtPayload
}

/**
 * Extract the JWT value from a raw `Cookie` header string.
 *
 * Parses the `__Host-indie_session` cookie value. Returns `undefined`
 * when the cookie is absent or the string is empty.
 *
 * @param cookieHeader — The raw `Cookie: key=val; key=val` header value
 */
export function parseAuthCookie(
  cookieHeader: string,
): string | undefined {
  if (!cookieHeader) return undefined

  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.startsWith('__Host-indie_session=')) {
      return trimmed.slice('__Host-indie_session='.length)
    }
  }
  return undefined
}
