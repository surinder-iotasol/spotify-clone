import { ApiResponse, ApiResponseMeta } from './response'

// --- Constants ---

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

// --- Types ---

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationMeta extends ApiResponseMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// --- Parse Pagination ---

/**
 * Parse page and limit from URL search params.
 * Returns 1-indexed page (default 1) and limit (default 20, max 100).
 */
export function parsePaginationParams(url: URL): PaginationParams {
  const rawPage = url.searchParams.get('page')
  const rawLimit = url.searchParams.get('limit')

  let page: number = DEFAULT_PAGE
  if (rawPage !== null) {
    const parsed = Number(rawPage)
    if (Number.isFinite(parsed) && parsed > 0) {
      page = Math.floor(parsed)
    }
  }

  let limit: number = DEFAULT_LIMIT
  if (rawLimit !== null) {
    const parsed = Number(rawLimit)
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(parsed, MAX_LIMIT)
    }
  }

  return { page, limit }
}

// --- Paginated Response ---

/**
 * Build a paginated JSON API response envelope.
 */
export function apiPaginatedResponse<T = unknown>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): ApiResponse<T[]> {
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }

  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    meta,
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
  }
}
