import { HttpError } from '@/app.types'

export function isHttpError(input: unknown): input is HttpError {
  return typeof input === 'object'
    && input !== null
    && 'statusCode' in input
    && (input.statusCode < 200 || input.statusCode >= 300)
}
