import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'

/**
 * Validate that the generated PrismaClient SDK exposes all
 * canonical model type names — proving the schema compiled
 * to type-safe model typings without TypeScript errors.
 */
describe('prisma-client-types', () => {
  it('instantiates PrismaClient without TypeScript errors', () => {
    // The bare import above would fail at compile time if the
    // Prisma schema were malformed; instantiation confirms the
    // generated client module resolves correctly.
    const client = new PrismaClient()
    expect(client).toBeInstanceOf(PrismaClient)
    // Graceful shutdown — no-op when no connection exists
    client.$disconnect()
  })

  it('exposes all canonical model name paths', () => {
    const client = new PrismaClient()

    // These must all be present on the generated client —
    // a missing property means the schema model is absent or
    // has a naming conflict that broke generation.
    expect(client.user).toBeDefined()
    expect(client.artistProfile).toBeDefined()
    expect(client.track).toBeDefined()
    expect(client.playlist).toBeDefined()
    expect(client.playlistTrack).toBeDefined()
    expect(client.like).toBeDefined()
    expect(client.follow).toBeDefined()
    expect(client.report).toBeDefined()
    expect(client.auditLog).toBeDefined()

    client.$disconnect()
  })
})
