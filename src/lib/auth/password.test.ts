import { describe, it, expect } from 'vitest'
import { hashPassword, comparePassword } from './password'

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('SecureP@ss1')

    expect(hash).toBeDefined()
    expect(typeof hash).toBe('string')
    // bcrypt hashes start with $2b$
    expect(hash.startsWith('$2b$')).toBe(true)
  })

  it('uses cost factor 12 — hash duration should be around 200-500ms', async () => {
    const start = Date.now()
    await hashPassword('TestPassword1')
    const elapsed = Date.now() - start

    expect(elapsed).toBeGreaterThan(100)
    expect(elapsed).toBeLessThan(1000)
  })

  it('produces different hashes for the same input (unique salt)', async () => {
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
