import bcrypt from 'bcryptjs'

/** Bcrypt cost factor 12 — provides ~250ms hash time per OWASP recommendations. */
const HASH_COST = 12

/**
 * Hash a plaintext password using bcrypt with cost factor 12.
 * @param plainText - The raw password to hash
 * @returns A bcrypt hash string (e.g. `$2b$12$...`)
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, HASH_COST)
}

/**
 * Compare a plaintext password against a bcrypt hash.
 * @param plainText - The raw password to check
 * @param hash - The stored bcrypt hash
 * @returns `true` if the password matches the hash
 */
export async function comparePassword(
  plainText: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plainText, hash)
}
