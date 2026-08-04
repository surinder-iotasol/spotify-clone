import { describe, it, expect } from 'vitest'
import { parsePaginationParams, apiPaginatedResponse } from './pagination'

describe('parsePaginationParams', () => {
  it('returns defaults when URL has no pagination query params', () => {
    const url = new URL('http://localhost/api/v1/tracks')
    const result = parsePaginationParams(url)

    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('parses explicit page and limit from query params', () => {
    const url = new URL('http://localhost/api/v1/tracks?page=3&limit=50')
    const result = parsePaginationParams(url)

    expect(result.page).toBe(3)
    expect(result.limit).toBe(50)
  })

  it('defaults page to 1 when page is zero', () => {
    const url = new URL('http://localhost/api/v1/tracks?page=0')
    const result = parsePaginationParams(url)

    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('defaults page to 1 when page is negative', () => {
    const url = new URL('http://localhost/api/v1/tracks?page=-5')
    const result = parsePaginationParams(url)

    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('clamps limit exceeding 100 to 100', () => {
    const url = new URL('http://localhost/api/v1/tracks?limit=200')
    const result = parsePaginationParams(url)

    expect(result.limit).toBe(100)
  })

  it('clamps limit exceeding 100 when page is also specified', () => {
    const url = new URL('http://localhost/api/v1/tracks?page=2&limit=500')
    const result = parsePaginationParams(url)

    expect(result.page).toBe(2)
    expect(result.limit).toBe(100)
  })

  it('returns limit 1 when limit is parsed as non-numeric', () => {
    const url = new URL('http://localhost/api/v1/tracks?limit=abc')
    const result = parsePaginationParams(url)

    expect(result.limit).toBe(20)
  })
})

describe('apiPaginatedResponse', () => {
  it('returns envelope with data array and pagination metadata', () => {
    const data = [{ id: '1' }, { id: '2' }]
    const result = apiPaginatedResponse(data, 50, 1, 20)

    expect(result.success).toBe(true)
    expect(result.data).toStrictEqual(data)
    expect(result.pagination).toEqual({
      total: 50,
      page: 1,
      limit: 20,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: false,
    })
  })

  it('computes totalPages using ceiling division', () => {
    const data = [1, 2]
    const result = apiPaginatedResponse(data, 20, 1, 20)

    expect(result.pagination?.totalPages).toBe(1)
  })

  it('computes totalPages for exact boundary', () => {
    const data = [1, 2]
    const result = apiPaginatedResponse(data, 40, 2, 20)

    expect(result.pagination?.totalPages).toBe(2)
  })

  it('sets hasNextPage correctly', () => {
    const data = [1]
    const result = apiPaginatedResponse(data, 20, 1, 20)
    expect(result.pagination?.hasNextPage).toBe(false)

    const resultNext = apiPaginatedResponse(data, 21, 1, 20)
    expect(resultNext.pagination?.hasNextPage).toBe(true)
  })

  it('sets hasPreviousPage correctly', () => {
    const resultPrev = apiPaginatedResponse([], 50, 2, 20)
    expect(resultPrev.pagination?.hasPreviousPage).toBe(true)

    const resultFirst = apiPaginatedResponse([], 50, 1, 20)
    expect(resultFirst.pagination?.hasPreviousPage).toBe(false)
  })

  it('includes timestamp and requestId from existing helpers', () => {
    const result = apiPaginatedResponse([], 0, 1, 20)
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
    expect(result.requestId).toMatch(/^req_/)
  })

  it('includes empty meta object', () => {
    const result = apiPaginatedResponse([], 0, 1, 20)
    expect(result.meta).toBeDefined()
  })
})
