import { describe, it, expect } from 'vitest'
import {
  hashPassword,
  comparePassword,
  sanitizePayload,
  sanitizeUser,
  omitPasswordHash,
  sanitizeError,
} from '@/lib/auth/password'

// --- Hashing ---

describe('hashPassword', () => {
  it('returns a bcrypt hash string starting with $2b$', async () => {
    const hash = await hashPassword('SecureP@ss1')
    expect(hash).toBeDefined()
    expect(typeof hash).toBe('string')
    expect(hash.startsWith('$2b$')).toBe(true)
  })

  it('uses cost factor 12 — hash duration should be around 250ms', async () => {
    const start = Date.now()
    await hashPassword('TestPassword1')
    const elapsed = Date.now() - start

    // Cost 12 typically takes ~200-500ms on CI machines
    expect(elapsed).toBeGreaterThan(100)
    expect(elapsed).toBeLessThan(1000)
  })

  it('produces different hashes for the same input (unique 16-byte salt)', async () => {
    const hash1 = await hashPassword('SamePassword1')
    const hash2 = await hashPassword('SamePassword1')

    expect(hash1).not.toBe(hash2)
  })

  it('handles long passwords correctly', async () => {
    const longPassword = 'A'.repeat(1000)
    const hash = await hashPassword(longPassword)

    expect(hash).toBeDefined()
    expect(hash.startsWith('$2b$')).toBe(true)
  })

  it('handles empty string input', async () => {
    const hash = await hashPassword('')
    expect(hash).toBeDefined()
    expect(hash.startsWith('$2b$')).toBe(true)
  })
})

// --- Verification ---

describe('comparePassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('SecureP@ss1')
    const match = await comparePassword('SecureP@ss1', hash)
    expect(match).toBe(true)
  })

  it('returns false for incorrect password', async () => {
    const hash = await hashPassword('SecureP@ss1')
    const match = await comparePassword('WrongPassword1', hash)
    expect(match).toBe(false)
  })

  it('returns false for empty password against non-empty hash', async () => {
    const hash = await hashPassword('SecureP@ss1')
    const match = await comparePassword('', hash)
    expect(match).toBe(false)
  })

  it('handles long passwords in comparison', async () => {
    const longPassword = 'B'.repeat(1000)
    const hash = await hashPassword(longPassword)
    const match = await comparePassword(longPassword, hash)
    expect(match).toBe(true)
  })
})

// --- Payload sanitization ---

describe('sanitizePayload', () => {
  it('strips passwordHash from a plain object', () => {
    const input = {
      id: 'usr_1',
      email: 'test@example.com',
      passwordHash: '$2b$12$abcdefg...',
      displayName: 'Test User',
    }
    const result = sanitizePayload(input) as Record<string, unknown>

    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('email')
    expect(result).toHaveProperty('displayName')
    expect(result).not.toHaveProperty('passwordHash')
  })

  it('strips multiple sensitive fields', () => {
    const input = {
      email: 'test@example.com',
      password: 'plaintext',
      apiKey: 'sk-abc123',
      token: 'jwt-token-here',
    }
    const result = sanitizePayload(input) as Record<string, unknown>

    expect(result).toHaveProperty('email')
    expect(result).not.toHaveProperty('password')
    expect(result).not.toHaveProperty('apiKey')
    expect(result).not.toHaveProperty('token')
  })

  it('recursively sanitizes nested objects', () => {
    const input = {
      user: {
        id: 'usr_1',
        passwordHash: '$2b$12$...',
        credentials: {
          password: 'secret',
        },
      },
    }
    const result = sanitizePayload(input) as Record<string, unknown>

    const user = result.user as Record<string, unknown>
    expect(user).toHaveProperty('id')
    expect(user).not.toHaveProperty('passwordHash')
    expect(user.credentials).not.toHaveProperty('password')
  })

  it('preserves arrays with sanitization', () => {
    const input = [
      { id: '1', passwordHash: 'hash1' },
      { id: '2', passwordHash: 'hash2' },
    ]
    const result = sanitizePayload(input) as Array<Record<string, unknown>>

    expect(result).toHaveLength(2)
    expect(result[0]).not.toHaveProperty('passwordHash')
    expect(result[1]).not.toHaveProperty('passwordHash')
    expect(result[0]).toHaveProperty('id')
  })

  it('returns primitives unchanged', () => {
    expect(sanitizePayload(null)).toBe(null)
    expect(sanitizePayload(undefined)).toBe(undefined)
    expect(sanitizePayload('hello')).toBe('hello')
    expect(sanitizePayload(42)).toBe(42)
    expect(sanitizePayload(true)).toBe(true)
  })
})

// --- User sanitization ---

describe('sanitizeUser', () => {
  it('removes passwordHash from a User-like object', () => {
    const user = {
      id: 'usr_1',
      email: 'test@example.com',
      passwordHash: '$2b$12$xK9mZ...',
      role: 'LISTENER',
      createdAt: new Date().toISOString(),
    }
    const sanitized = sanitizeUser(user) as Record<string, unknown>

    expect(sanitized).toHaveProperty('id')
    expect(sanitized).toHaveProperty('email')
    expect(sanitized).toHaveProperty('role')
    expect(sanitized).toHaveProperty('createdAt')
    expect(sanitized).not.toHaveProperty('passwordHash')
  })
})

// --- Prisma query wrapper ---

describe('omitPasswordHash', () => {
  it('returns an object with passwordHash set to false', () => {
    const result = omitPasswordHash()

    expect(result).toHaveProperty('passwordHash')
    expect(result.passwordHash).toBe(false)
  })

  it('can be spread into a Prisma select object', () => {
    const select: Record<string, boolean> = {
      id: true,
      email: true,
      ...omitPasswordHash(),
    }

    expect(select.id).toBe(true)
    expect(select.email).toBe(true)
    expect(select.passwordHash).toBe(false)
  })
})

// --- Error sanitization ---

describe('sanitizeError', () => {
  it('redacts bcrypt hashes from error messages', () => {
    const hash = '$2b$12$xK9mZq3Y7w5pN1bR8tL6vOuGcEhJdFgKiLmNoPqRsTuVwXyZaBcDe'
    const error = new Error(`Failed login: ${hash}`)
    const sanitized = sanitizeError(error)

    expect(String(sanitized)).not.toContain(hash)
    expect(String(sanitized)).toContain('[PASSWORD_HASH_REDACTED]')
  })

  it('returns the original string when no hash is present', () => {
    const error = new Error('Something went wrong')
    const sanitized = sanitizeError(error)

    // String(new Error(...)) includes "Error: " prefix
    expect(String(sanitized)).toBe('Error: Something went wrong')
  })

  it('handles error objects with hash in stack trace', () => {
    // Use a long-enough hash string so the regex (.{50,}) matches
    const hash = '$2b$12$abcdefghijklmnopqrstuuuvwxyz0123456789ABCDEFGHIJklmn'
    const error = new Error(`stack: ${hash}`)
    const sanitized = sanitizeError(error)

    expect(String(sanitized)).not.toContain(hash)
    expect(String(sanitized)).toContain('[PASSWORD_HASH_REDACTED]')
  })
})
