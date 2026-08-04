// ─────────────────────────────────────────────
// Environment variable validation (Zod v4)
// ─────────────────────────────────────────────
// Parses process.env at startup and throws on
// missing / invalid values so the server fails
// fast rather than misbehaving at runtime.

import { z } from 'zod/v4'

/** Strict schema matching .env.example fields. */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  S3_ENDPOINT: z.string(),
})

/**
 * Parse and validate all required environment variables.
 * @throws {Error} When any required variable is missing or invalid.
 */
export function parseEnv(): z.infer<typeof envSchema> {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const reasons = parsed.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n  ')
    throw new Error(`Invalid environment variables:\n  ${reasons}`)
  }

  return parsed.data
}

/** Lazily-evaluated singleton — parsed once per process. */
let _env: z.infer<typeof envSchema> | null = null

/**
 * Access validated environment variables.
 * Calls `parseEnv()` on first access (side-effect).
 */
export function env(): z.infer<typeof envSchema> {
  if (!_env) {
    _env = parseEnv()
  }
  return _env
}
