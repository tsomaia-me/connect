import { Attachment, Point } from '@/components/shared/types'
import { User } from '@/app.models'

export interface VideoNoteProps {

}

export interface VideoNote {
  type: 'text' | 'video' | 'audio'
  id: string
  width: number
  height: number
  relativePoint: Point
  content: string
  mode: 'edit' | 'view'
  author: User
  attachments: Attachment[]
}

export function VideoNote() {

}
