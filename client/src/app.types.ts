export type SignalType =
  | 'join_request'
  | 'offer'
  | 'answer'
  | 'icecandidate'

export interface HttpError {
  message: string
  error: string
  statusCode: number
}
