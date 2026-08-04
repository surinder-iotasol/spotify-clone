import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

/** Save the original env once so tests can restore it. */
const ORIG_ENV = { ...process.env }

function resetEnv(): void {
  // Delete ALL keys from process.env, then restore only what exists in ORIG_ENV.
  for (const key of Object.keys(process.env)) {
    delete (process.env as NodeJS.ProcessEnv)[key]
  }
  Object.assign(process.env, ORIG_ENV)
}

function fullEnv(): Record<string, string> {
  return {
    DATABASE_URL: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'test-secret',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
    AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    S3_BUCKET_NAME: 'my-bucket',
    S3_ENDPOINT: '',
  }
}

/**
 * Load env.ts with a fresh process.env snapshot via dynamic import.
 * The module is cached across tests, so we must set env BEFORE the import.
 */
async function loadEnv() {
  await vi.resetModules()
  return await import('./env')
}

// ── parseEnv ──────────────────────────────────────────────────────────────────

describe('parseEnv', () => {
  beforeEach(() => {
    resetEnv()
    vi.restoreAllMocks()
  })

  it('returns parsed data when all required vars are present', async () => {
    Object.assign(process.env, fullEnv())
    const { parseEnv } = await loadEnv()
    const result = parseEnv()

    expect(result.DATABASE_URL).toBe('mongodb://localhost:27017/test')
    expect(result.JWT_SECRET).toBe('test-secret')
    expect(result.AWS_REGION).toBe('us-east-1')
    expect(result.S3_BUCKET_NAME).toBe('my-bucket')
    expect(result.S3_ENDPOINT).toBe('')
  })

  it('throws when DATABASE_URL is missing', async () => {
    const env = fullEnv()
    delete env.DATABASE_URL
    Object.assign(process.env, env)
    const { parseEnv } = await loadEnv()
    expect(() => parseEnv()).toThrow('Invalid environment variables')
  })

  it('throws when DATABASE_URL is not a valid URL', async () => {
    Object.assign(process.env, fullEnv())
    process.env.DATABASE_URL = 'not-a-url'
    const { parseEnv } = await loadEnv()
    expect(() => parseEnv()).toThrow('Invalid environment variables')
  })

  it('throws when JWT_SECRET is empty', async () => {
    Object.assign(process.env, fullEnv())
    process.env.JWT_SECRET = ''
    const { parseEnv } = await loadEnv()
    expect(() => parseEnv()).toThrow('Invalid environment variables')
  })

  it('throws when AWS_SECRET_ACCESS_KEY is missing', async () => {
    const env = fullEnv()
    delete env.AWS_SECRET_ACCESS_KEY
    Object.assign(process.env, env)
    const { parseEnv } = await loadEnv()
    expect(() => parseEnv()).toThrow('Invalid environment variables')
  })

  it('throws when S3_BUCKET_NAME is missing', async () => {
    const env = fullEnv()
    delete env.S3_BUCKET_NAME
    Object.assign(process.env, env)
    const { parseEnv } = await loadEnv()
    expect(() => parseEnv()).toThrow('Invalid environment variables')
  })
})

// ── env (singleton) ──────────────────────────────────────────────────────────

describe('env', () => {
  beforeEach(() => {
    resetEnv()
    vi.restoreAllMocks()
  })

  it('caches parsed result across multiple calls', async () => {
    Object.assign(process.env, fullEnv())
    const { env } = await loadEnv()

    const first = env()
    const second = env()

    expect(first).toBe(second)
    expect(first).toBe(second)
  })
})
