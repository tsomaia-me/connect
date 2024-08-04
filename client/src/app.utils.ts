import { HttpError } from '@/app.types'

export function isObject(input: unknown): input is object {
  return typeof input === 'object' && input !== null
}

export function isHttpError(input: unknown): input is HttpError {
  return isObject(input)
    && 'statusCode' in input
    && ((input as any).statusCode < 200 || (input as any).statusCode >= 300)
}
