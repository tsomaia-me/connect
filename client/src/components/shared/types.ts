import { ButtonHTMLAttributes, DetailedHTMLProps } from 'react'
import { User } from '@/app.models'

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

export type Point = [x: number, y: number]
export type MetaPoint = [x: number, y: number, ...meta: unknown[]]
export interface Box {
  width: number
  height: number
}

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  isPrimary: boolean
  role?: 'file' | 'video' | 'thumbnail'
  metadata: Record<string, any>
}

export interface Note {
  type: 'text' | 'video' | 'audio'
  id: string
  isDraft: boolean
  width: number
  height: number
  relativePoint: Point
  content: string
  mode: 'edit' | 'view'
  author: User
  attachments: Attachment[]
}

export type UpdateNote = Partial<Note> & { id: string }
