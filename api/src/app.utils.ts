import { v4 as uuid } from 'uuid'
import { SocketErrorResponse, SocketSuccessResponse } from './app.types'

export function findUniqueUuid(map: Set<string>) {
  let key: string

  do {
    key = uuid()
  } while (map.has(key))

  return key
}

export function toSocketSuccessResponse<T>(payload: T): SocketSuccessResponse<T> {
  return {
    ok: true,
    payload,
  }
}

export function toSocketErrorResponse(statusCode: number, message: string): SocketErrorResponse {
  return {
    ok: false,
    statusCode,
    message,
  }
}
