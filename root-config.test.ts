import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

const root = __dirname

describe('root-config', () => {
  it('.gitignore exists and covers required patterns', () => {
    const p = join(root, '.gitignore')
    expect(existsSync(p)).toBe(true)
    const content = readFileSync(p, 'utf-8')
    expect(content).toContain('node_modules')
    expect(content).toContain('.next')
    expect(content).toContain('.env')
    expect(content).toContain('build')
  })

  it('.editorconfig specifies 2-space indent, UTF-8, LF', () => {
    const p = join(root, '.editorconfig')
    expect(existsSync(p)).toBe(true)
    const content = readFileSync(p, 'utf-8')
    expect(content).toContain('indent_size = 2')
    expect(content).toContain('charset = utf-8')
    expect(content).toContain('end_of_line = lf')
  })

  it('README.md exists and documents key sections', () => {
    const p = join(root, 'README.md')
    expect(existsSync(p)).toBe(true)
    const content = readFileSync(p, 'utf-8')
    expect(content).toContain('Prerequisites')
    expect(content).toContain('npm install')
    expect(content).toContain('npm run')
  })

  it('package.json has name "spotify" and is private', () => {
    const p = join(root, 'package.json')
    expect(existsSync(p)).toBe(true)
    const pkg = JSON.parse(readFileSync(p, 'utf-8'))
    expect(pkg.name).toBe('spotify')
    expect(pkg.private).toBe(true)
  })
})
