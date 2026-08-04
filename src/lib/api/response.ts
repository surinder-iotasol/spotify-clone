import { z } from 'zod'

// --- Sensitive field patterns ---

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api_key/i,
  /apiKey/i,
  /creditCard/i,
  /credit_card/i,
  /ssn/i,
  /authorization/i,
  /bearer/i,
] as const

/**
 * Check if a key matches sensitive field patterns.
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))
}

/**
 * Sanitize an object by removing keys that match sensitive patterns.
 * Works recursively on nested plain objects.
 */
function sanitizeObject(
  obj: unknown,
): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      // Redact secret strings like sk-xxxxxxxxxxxxx
      return obj.replace(/sk-[A-Za-z0-9\-]{6,}/gi, '[REDACTED]')
    }
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item))
  }
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      continue // omit the key entirely
    }
    // If field is sensitive, strip the associated value key
    if (key === 'value' && isSensitiveKey(String((obj as Record<string, unknown>).field ?? ''))) {
      continue
    }
    result[key] = sanitizeObject(value)
  }
  return result
}

// --- Types ---

export interface ApiResponseMeta {
  page?: number
  limit?: number
  total?: number
  [key: string]: unknown
}

export interface PaginationInfo {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  pagination?: PaginationInfo
  meta?: ApiResponseMeta
  error?: {
    code: number
    message: string
    details?: unknown[]
  }
  timestamp: string
  requestId: string
}

export interface ValidationErrorDetail {
  field: string
  message: string
  value?: unknown
}

// --- Success Response ---

export function apiSuccessResponse<T = unknown>(
  data: T,
  meta?: ApiResponseMeta,
): ApiResponse<T> {
  return {
    success: true,
    data: sanitizeObject(data) as T,
    ...(meta ? { meta } : {}),
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
  }
}

// --- Error Response ---

export function apiErrorResponse(
  code: number,
  message: string,
  details?: unknown[],
): ApiResponse {
  const sanitizedDetails = details ? details.map(sanitizeObject) : undefined
  return {
    success: false,
    error: {
      code,
      message,
      ...(sanitizedDetails && sanitizedDetails.length > 0
        ? { details: sanitizedDetails }
        : {}),
    },
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
  }
}

// --- Request ID ---

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

// --- Validation Middleware ---

export interface NextRequestLike {
  json(): Promise<unknown>
}

export interface NextResponseLike {
  status: number
  json(): unknown
}

export type RequestHandler = (
  req: NextRequestLike,
  res: { status: number; json: (body: unknown) => void },
) => Promise<void>

/**
 * Zod schema validation middleware.
 * Validates request body against a Zod schema.
 * Returns HTTP 422 with ValidationErrorDetail[] on failure.
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T): RequestHandler {
  return async (req, res) => {
    let body: unknown
    try {
      body = await (req as NextRequestLike).json()
    } catch {
      res.status(400)
      res.json(
        apiErrorResponse(400, 'Invalid JSON in request body'),
      )
      return
    }

    const parseResult = safeParseZod(schema, body)

    if (!parseResult.success) {
      const details: ValidationErrorDetail[] = parseResult.errors.map(
        (issue) => ({
          field: issue.path.join('.') || '_',
          message: issue.message,
          value: issue.input,
        }),
      )
      res.status(422)
      res.json(
        apiErrorResponse(422, 'Validation failed', details),
      )
      return
    }

    // Attach validated data to request for downstream handlers
    ;(req as NextRequestLike & { validatedData?: z.infer<T> }).validatedData =
      parseResult.data as z.infer<T>
  }
}

type ZodParseResult<T> =
  | { success: true; data: T; errors: never[] }
  | { success: false; data: never; errors: z.ZodIssue[] }

function safeParseZod<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): ZodParseResult<z.infer<T>> {
  try {
    const data = schema.parse(input)
    return { success: true, data, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, data: undefined as never, errors: error.issues }
    }
    return {
      success: false,
      data: undefined as never,
      errors: [{ message: String(error), path: [], code: z.ZodErrorShape.custom }]
    }
  }
}
