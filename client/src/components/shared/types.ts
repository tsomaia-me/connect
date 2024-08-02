import { ButtonHTMLAttributes, DetailedHTMLProps } from 'react'

export interface FieldParams<T extends string | number | null> {
  value: T
  onChange: (value: T) => void
}

export interface SocketSuccessResponse<T> {
  ok: true
  payload: T
}

export interface SocketErrorResponse {
  ok: false
  statusCode: number
  message: string
}

export type SocketResponse<T> = SocketSuccessResponse<T> | SocketErrorResponse

export type HtmlButtonProps = DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>
