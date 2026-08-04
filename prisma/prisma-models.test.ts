import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

const root = __dirname

describe('prisma-models', () => {
  it('schema.prisma exists with MongoDB provider', () => {
    const p = join(root, 'schema.prisma')
    expect(existsSync(p)).toBe(true)
    const content = readFileSync(p, 'utf-8')
    expect(content).toContain('provider = "mongodb"')
  })

  it('defines all required enums', () => {
    const p = join(root, 'schema.prisma')
    const content = readFileSync(p, 'utf-8')
    const requiredEnums = [
      'enum UserRole',
      'enum AccountStatus',
      'enum TrackStatus',
      'enum Genre',
      'enum ReportReason',
      'enum ReportStatus',
      'enum AuditAction',
    ]
    for (const en of requiredEnums) {
      expect(content).toContain(en)
    }
  })

  it('defines all canonical models', () => {
    const p = join(root, 'schema.prisma')
    const content = readFileSync(p, 'utf-8')
    const requiredModels = [
      'model User',
      'model ArtistProfile',
      'model Track',
      'model Playlist',
      'model PlaylistTrack',
      'model Like',
      'model Follow',
      'model Report',
      'model AuditLog',
    ]
    for (const model of requiredModels) {
      expect(content).toContain(model)
    }
  })

  it('has compound unique indexes', () => {
    const p = join(root, 'schema.prisma')
    const content = readFileSync(p, 'utf-8')
    expect(content).toContain('@unique([playlistId, position])')
    expect(content).toContain('@unique([playlistId, trackId])')
    expect(content).toContain('@unique([userId, trackId])')
    expect(content).toContain('@unique([followerId, artistProfileId])')
  })

  it('has compound unique index on Like model', () => {
    const p = join(root, 'schema.prisma')
    const content = readFileSync(p, 'utf-8')
    // Like model should have @unique([userId, trackId])
    const likeSection = content.split('model Like')[1]?.split('model ')[0] || ''
    expect(likeSection).toContain('@unique([userId, trackId])')
  })

  it('has compound unique indexes on PlaylistTrack model', () => {
    const p = join(root, 'schema.prisma')
    const content = readFileSync(p, 'utf-8')
    const ptSection = content.split('model PlaylistTrack')[1]?.split('model ')[0] || ''
    expect(ptSection).toContain('@unique([playlistId, position])')
    expect(ptSection).toContain('@unique([playlistId, trackId])')
  })

  it('has compound unique index on Follow model', () => {
    const p = join(root, 'schema.prisma')
    const content = readFileSync(p, 'utf-8')
    const followSection = content.split('model Follow')[1]?.split('model ')[0] || ''
    expect(followSection).toContain('@unique([followerId, artistProfileId])')
  })

  it('defines proper relational attributes', () => {
    const p = join(root, 'schema.prisma')
    const content = readFileSync(p, 'utf-8')
    // Check for relation directives
    expect(content).toContain('@relation')
    expect(content).toContain('fields:')
    expect(content).toContain('references:')
  })

  it('has AuditAction enum with required values', () => {
    const p = join(root, 'schema.prisma')
    const content = readFileSync(p, 'utf-8')
    const auditSection = content.split('enum AuditAction')[1]?.split('\n\n')[0] || ''
    const requiredActions = [
      'USER_REGISTERED',
      'USER_LOGIN_FAILED',
      'USER_LOGIN_SUCCESS',
      'TOKEN_ISSUED',
      'TOKEN_REVOKED',
      'BUILD_START',
      'BUILD_FAIL',
      'STORY_RUN_SUCCESS',
      'STORY_RUN_FAIL',
      'MIGRATION_RUN',
    ]
    for (const action of requiredActions) {
      expect(auditSection).toContain(action)
    }
  })

  it('has AuditSeverity enum with required values', () => {
    const p = join(root, 'schema.prisma')
    const content = readFileSync(p, 'utf-8')
    const severitySection = content.split('enum AuditSeverity')[1]?.split('\n\n')[0] || ''
    const requiredSeverities = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL']
    for (const sev of requiredSeverities) {
      expect(severitySection).toContain(sev)
    }
  })

  it('User model has role enum field', () => {
    const p = join(root, 'schema.prisma')
    const content = readFileSync(p, 'utf-8')
    const userSection = content.split('model User')[1]?.split('model ')[0] || ''
    expect(userSection).toContain('role')
    expect(userSection).toContain('UserRole')
  })

  it('Track model has status and genre fields', () => {
    const p = join(root, 'schema.prisma')
    const content = readFileSync(p, 'utf-8')
    const trackSection = content.split('model Track')[1]?.split('model ')[0] || ''
    expect(trackSection).toContain('status')
    expect(trackSection).toContain('TrackStatus')
    expect(trackSection).toContain('genre')
    expect(trackSection).toContain('Genre')
  })
})
