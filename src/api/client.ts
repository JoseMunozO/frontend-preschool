import { env } from '../config/env'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

let authToken: string | null = null

export function setApiAuthToken(token: string | null) {
  authToken = token
}

export class ApiError extends Error {
  status: number
  details: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export class ApiNetworkError extends Error {
  constructor(message = 'No se pudo conectar con el backend. Verifica que este iniciado.') {
    super(message)
    this.name = 'ApiNetworkError'
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers)

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`)
  }

  let response: Response

  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiNetworkError()
  }

  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String(payload.message)
        : `API request failed with status ${response.status}`

    throw new ApiError(response.status, message, payload)
  }

  return payload as T
}
