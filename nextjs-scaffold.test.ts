import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

const root = __dirname

describe('nextjs-scaffold', () => {
  it('tsconfig.json enforces strict mode and ES2022 target', () => {
    const p = join(root, 'tsconfig.json')
    expect(existsSync(p)).toBe(true)
    const config = JSON.parse(readFileSync(p, 'utf-8'))
    expect(config.compilerOptions.strict).toBe(true)
    expect(config.compilerOptions.target).toBe('ES2022')
    expect(config.compilerOptions.paths).toEqual({
      '@/*': ['./src/*'],
    })
  })

  it('app/layout.tsx exists as a React Server Component', () => {
    const p = join(root, 'src', 'app', 'layout.tsx')
    expect(existsSync(p)).toBe(true)
    const content = readFileSync(p, 'utf-8')
    expect(content).toContain('export default')
    expect(content).toContain('<html')
    expect(content).toContain('<body')
  })

  it('app/page.tsx exists as a minimal page', () => {
    const p = join(root, 'src', 'app', 'page.tsx')
    expect(existsSync(p)).toBe(true)
    const content = readFileSync(p, 'utf-8')
    expect(content).toContain('export default')
  })

  it('globals.css exists for CSS foundations', () => {
    const p = join(root, 'src', 'app', 'globals.css')
    expect(existsSync(p)).toBe(true)
    const content = readFileSync(p, 'utf-8')
    expect(content.length).toBeGreaterThan(0)
  })

  it('next.config.mjs exists', () => {
    const p = join(root, 'next.config.mjs')
    expect(existsSync(p)).toBe(true)
  })

  it('package.json has next@14', () => {
    const p = join(root, 'package.json')
    const pkg = JSON.parse(readFileSync(p, 'utf-8'))
    const nextVer = pkg.dependencies?.['next'] || pkg.devDependencies?.['next']
    expect(nextVer).toBeDefined()
    expect(nextVer).toMatch(/^[\^~]?14\./)
  })
})
