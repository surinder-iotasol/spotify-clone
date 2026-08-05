import { NextRequest, NextResponse } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { middleware } from '../../../middleware'
import { generateToken } from './token'

// ---------- helpers ----------

function createMockNextRequest(
  path: string,
  cookieHeader?: string,
): NextRequest {
  const noOp = () => new URL('http://localhost' + path)

  const mockReq = {
    nextUrl: new URL('http://localhost' + path),
    headers: new Map<string, string>(),
  }

  if (cookieHeader) {
    mockReq.headers.set('cookie', cookieHeader)
  }

  return mockReq as unknown as NextRequest
}

// prettier: classic JWS parts we can reuse everywhere
const FAKE_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiMTIzIiwicm9sZSI6IkFETUlOIn0.abc'
const FAKE_JWT_ARTIST =
  'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiNDU2Iiwicm9sZSI6IkFSVElTVCJ9.def'

afterEach(() => {
  vi.unstubAllEnvs()
})

// =========================== 401 — no session ===========================

describe('middleware — no session → 401', () => {
  const protectedPaths = [
    '/admin/users',
    '/api/v1/admin/settings',
    '/api/v1/artist/profile',
    '/api/v1/playlists',
    '/api/v1/reports/analytics',
  ]

  for (const path of protectedPaths) {
    it(`returns 401 for ${path}`, async () => {
      const req = createMockNextRequest(path)
      const res = await middleware(req)

      expect(res.status).toBe(401)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.success).toBe(false)
      expect((body.error as { code: number }).code).toBe(401)
    })
  }
})

// =========================== 401 — expired / bad token ===========================

describe('middleware — invalid token → 401', () => {
  it('returns 401 for tampered token', async () => {
    const req = createMockNextRequest('/api/v1/artist/profile')
    // fudge the cookie so the path does not match any real cookie pattern
    req.headers.set('cookie', '__Host-indie_session=fake.tampered.token')
    const res = await middleware(req)

    expect(res.status).toBe(401)
  })
})

// =========================== 403 — insufficient role ===========================

describe('middleware — role check → 403', () => {
  it('LISTENER accessing /api/v1/artist → 403', async () => {
    const token = await generateToken('user-123', 'LISTENER')
    const req = createMockNextRequest('/api/v1/artist/profile')
    req.headers.set(
      'cookie',
      `__Host-indie_session=${token}`,
    )
    const res = await middleware(req)

    expect(res.status).toBe(403)
    const body = (await res.json()) as Record<string, unknown>
    expect((body.error as { code: number }).code).toBe(403)
  })

  it('LISTENER accessing /admin → 401 if cookie validates but path is admin-only', async () => {
    // With LISTENER token, the cookie actually validates (same secret), then we get a 403
    const token = await generateToken('user-123', 'LISTENER')
    const req = createMockNextRequest('/admin/users')
    req.headers.set(
      'cookie',
      `__Host-indie_session=${token}`,
    )
    const res = await middleware(req)

    expect(res.status).toBe(403)
  })
})

// =========================== 200 — valid headers injected ===========================

describe('middleware — valid admin → 200 with headers', () => {
  it('injests x-user-id, x-user-role for ADMIN', async () => {
    const token = await generateToken('user-admin-1', 'ADMIN')
    const req = createMockNextRequest('/admin/users')
    req.headers.set('cookie', `__Host-indie_session=${token}`)
    const res = await middleware(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('x-user-id')).toBe('user-admin-1')
    expect(res.headers.get('x-user-role')).toBe('ADMIN')
  })

  it('injests x-user-id, x-user-role, x-artist-profile-id for ARTIST with profile', async () => {
    const token = await generateToken(
      'user-artist-1',
      'ARTIST',
      'artist-xyz',
    )
    const req = createMockNextRequest('/api/v1/artist/profile')
    req.headers.set('cookie', `__Host-indie_session=${token}`)
    const res = await middleware(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('x-user-id')).toBe('user-artist-1')
    expect(res.headers.get('x-user-role')).toBe('ARTIST')
    expect(res.headers.get('x-artist-profile-id')).toBe('artist-xyz')
  })
})

// =========================== public routes bypass ===========================

describe('middleware — public routes bypass', () => {
  it('returns 200 for /search without cookie', async () => {
    const req = createMockNextRequest('/search')
    const res = await middleware(req)
    expect(res.status).toBe(200)
  })

  it('returns 200 for track stream endpoint', async () => {
    const req = createMockNextRequest('/api/v1/tracks/abc/stream')
    const res = await middleware(req)
    expect(res.status).toBe(200)
  })
})
