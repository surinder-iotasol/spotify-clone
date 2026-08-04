import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn helper', () => {
  it('returns a single class unchanged', () => {
    expect(cn('text-lg')).toBe('text-lg')
  })

  it('merges multiple class strings', () => {
    expect(cn('text-lg', 'font-bold')).toBe('text-lg font-bold')
  })

  it('deduplicates overlapping classes', () => {
    expect(cn('text-lg', 'text-sm')).toBe('text-sm')
    expect(cn('p-4', 'p-6')).toBe('p-6')
  })

  it('ignores falsy values (undefined, null, false)', () => {
    expect(cn('text-lg', undefined, null, false, 'font-bold')).toBe('text-lg font-bold')
  })

  it('accepts class objects with truthy/falsy values', () => {
    expect(cn({ 'text-lg': true, 'text-sm': false })).toBe('text-lg')
  })

  it('merges object classes with string classes', () => {
    // twMerge: p-4 overrides p-2, bg-red-500 is non-conflicting so preserved
    expect(cn('p-2', { 'p-4': true, 'bg-red-500': true })).toBe('p-4 bg-red-500')
  })
})
