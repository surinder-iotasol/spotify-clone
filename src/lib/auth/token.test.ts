import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateToken, verifyToken, parseAuthCookie } from './token'

const TEST_SECRET = 'test-jwt-secret-for-unit-tests'
const WRONG_SECRET = 'wrong-secret-for-tests'

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', TEST_SECRET)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('generateToken', () => {
  it('returns a compact JWT string', async () => {
    const token = await generateToken('user-123', 'LISTENER')

    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    // JWT has 3 dot-separated parts
    const parts = token.split('.')
    expect(parts.length).toBe(3)
  })

  it('includes userId and role in payload', async () => {
    const token = await generateToken('user-456', 'ARTIST')
    const payload = await verifyToken(token)

    expect(payload.userId).toBe('user-456')
    expect(payload.role).toBe('ARTIST')
  })

  it('expires in ~7 days (604800 seconds)', async () => {
    const token = await generateToken('user-789', 'ADMIN')
    const payload = await verifyToken(token)

    const expiresIn = payload.exp - payload.iat
    expect(expiresIn).toBe(604800)
  })

  it('includes optional artistProfileId when provided', async () => {
    const token = await generateToken('user-abc', 'ARTIST', 'artist-xyz')
    const payload = await verifyToken(token)

    expect(payload.userId).toBe('user-abc')
    expect(payload.role).toBe('ARTIST')
    expect(payload.artistProfileId).toBe('artist-xyz')
  })

  it('excludes artistProfileId when not provided', async () => {
    const token = await generateToken('user-abc', 'LISTENER')
    const payload = await verifyToken(token)

    expect(payload.userId).toBe('user-abc')
    expect(payload.role).toBe('LISTENER')
    expect(payload.artistProfileId).toBeUndefined()
  })

  it('fails to verify with wrong secret', async () => {
    const token = await generateToken('user-123', 'LISTENER')
    vi.unstubAllEnvs()
    vi.stubEnv('JWT_SECRET', WRONG_SECRET)

    await expect(() => verifyToken(token)).rejects.toThrow()
  })
})

describe('parseAuthCookie', () => {
  it('extracts JWT from a standard cookie header string', () => {
    const cookie = '__Host-indie_session=eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiMTIzIn0.abc'

    const result = parseAuthCookie(cookie)

    expect(result).toBe('eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiMTIzIn0.abc')
  })

  it('extracts JWT when cookie header has multiple entries', () => {
    const cookie = 'other=value; __Host-indie_session=eyJhbGciOiJIUzI1NiJ9.tok.abc; another=data'

    const result = parseAuthCookie(cookie)

    expect(result).toBe('eyJhbGciOiJIUzI1NiJ9.tok.abc')
  })

  it('returns undefined when cookie is not present', () => {
    const result = parseAuthCookie('other=value')

    expect(result).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    const result = parseAuthCookie('')

    expect(result).toBeUndefined()
  })

  it('returns undefined for null', () => {
    const result = parseAuthCookie(null as unknown as string)

    expect(result).toBeUndefined()
  })
})
