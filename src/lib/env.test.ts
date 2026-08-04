import { describe, expect, it, vi } from 'vitest'

/** Minimal valid env for reuse. */
function makeEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    DATABASE_URL: 'mongodb://localhost:27017/iota-hub',
    JWT_SECRET: 'test-jwt-secret',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
    AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    S3_BUCKET_NAME: 'iota-hub-assets',
    S3_ENDPOINT: '',
    NODE_ENV: 'test',
    ...overrides,
  }
}

/**
 * Load a fresh copy of env.ts so each test gets an isolated module
 * snapshot.  Required because Vitest caches ES modules and
 * process.env changes in one test leak into the next.
 */
function loadEnv() {
  const mod = require('./env')
  return { parseEnv: mod.parseEnv, ensureEnv: mod.ensureEnv }
}

describe('parseEnv', () => {
  it('returns success when all required vars are present', () => {
    Object.assign(process.env, makeEnv())
    const { parseEnv } = loadEnv()
    const result = parseEnv()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.DATABASE_URL).toBe('mongodb://localhost:27017/iota-hub')
      expect(result.data.JWT_SECRET).toBe('test-jwt-secret')
    }
  })

  it('returns error when DATABASE_URL is missing', () => {
    const env = makeEnv({ DATABASE_URL: '' })
    delete env.DATABASE_URL
    Object.assign(process.env, env)
    const { parseEnv } = loadEnv()
    expect(parseEnv().success).toBe(false)
  })

  it('returns error when JWT_SECRET is missing', () => {
    const env = makeEnv({ JWT_SECRET: '' })
    delete env.JWT_SECRET
    Object.assign(process.env, env)
    const { parseEnv } = loadEnv()
    expect(parseEnv().success).toBe(false)
  })

  it('returns error when AWS_REGION is missing', () => {
    const env = makeEnv({ AWS_REGION: '' })
    delete env.AWS_REGION
    Object.assign(process.env, env)
    const { parseEnv } = loadEnv()
    expect(parseEnv().success).toBe(false)
  })

  it('returns error when S3_BUCKET_NAME is missing', () => {
    const env = makeEnv({ S3_BUCKET_NAME: '' })
    delete env.S3_BUCKET_NAME
    Object.assign(process.env, env)
    const { parseEnv } = loadEnv()
    expect(parseEnv().success).toBe(false)
  })

  it('returns error when NODE_ENV has invalid value', () => {
    Object.assign(process.env, makeEnv({ NODE_ENV: 'staging' }))
    const { parseEnv } = loadEnv()
    expect(parseEnv().success).toBe(false)
  })

  it('returns error when DATABASE_URL is not a valid URL', () => {
    Object.assign(process.env, makeEnv({ DATABASE_URL: 'not-a-url' }))
    const { parseEnv } = loadEnv()
    expect(parseEnv().success).toBe(false)
  })

  it('includes S3_ENDPOINT when provided as empty string', () => {
    Object.assign(process.env, makeEnv({ S3_ENDPOINT: '' }))
    const { parseEnv } = loadEnv()
    expect(parseEnv().success).toBe(true)
    if (parseEnv().success) {
      expect(parseEnv().data.S3_ENDPOINT).toBe('')
    }
  })

  it('includes S3_ENDPOINT when provided as valid URL', () => {
    Object.assign(process.env, makeEnv({ S3_ENDPOINT: 'https://r2.example.com' }))
    const { parseEnv } = loadEnv()
    expect(parseEnv().success).toBe(true)
  })
})

describe('ensureEnv', () => {
  it('returns parsed data when all vars are valid', () => {
    Object.assign(process.env, makeEnv())
    const { ensureEnv } = loadEnv()
    const result = ensureEnv()
    expect(result.DATABASE_URL).toBe('mongodb://localhost:27017/iota-hub')
    expect(result.JWT_SECRET).toBe('test-jwt-secret')
  })

  it('exits the process when required vars are missing', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(
      (() => { throw new Error('_exit_') }) as never,
    )
    Object.assign(process.env, makeEnv({ JWT_SECRET: '' }))
    delete process.env.JWT_SECRET
    const { ensureEnv } = loadEnv()
    expect(() => ensureEnv()).toThrow('_exit_')
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })

  it('exits the process when NODE_ENV is invalid', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(
      (() => { throw new Error('_exit_') }) as never,
    )
    Object.assign(process.env, makeEnv({ NODE_ENV: 'staging' }))
    const { ensureEnv } = loadEnv()
    expect(() => ensureEnv()).toThrow('_exit_')
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })
})
