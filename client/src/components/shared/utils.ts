import { v4 as uuid } from 'uuid'
import { Attachment, Box, Point, TimePoint } from '@/components/shared/types'

export function getRelativePoint([x, y]: Point, container: Box): Point
export function getRelativePoint([x, y, time]: TimePoint, container: Box): TimePoint
export function getRelativePoint([x, y, ...rest]: Point | TimePoint, container: Box): Point | TimePoint {
  return [x / container.width, y / container.height, ...rest] as Point
}

export function getAbsolutePoint([x, y]: Point, container: Box): Point
export function getAbsolutePoint([x, y, time]: TimePoint, container: Box): TimePoint
export function getAbsolutePoint([x, y, ...rest]: Point | TimePoint, container: Box): Point | TimePoint {
  return [Math.round(x * container.width), Math.round(y * container.height), ...rest] as Point
}

export function generateId() {
  return `${uuid()}_${Date.now()}_${Math.random() * 1000000000}`
}

export function getFormattedFileSize(size: number) {
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB']
  let unitIndex = 0

  if (size === 0) {
    return '0 KB'
  }

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    ++unitIndex
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

export function download(attachment: Attachment, content: ArrayBuffer | Blob) {
  const a = document.createElement('a')
  const blob = content instanceof Blob ? content as Blob : new Blob([content], { type: attachment.type })
  a.href = URL.createObjectURL(blob)
  a.download = attachment.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const l = bytes.byteLength

  for (let i = 0; i < l; ++i) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string) {
  let binary = atob(base64)
  const l = binary.length
  const bytes = new Uint8Array(l)

  for (let i = 0; i < l; ++i) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes.buffer
}

export function getChunks(data: string, chunkSize: number) {
  let offset = 0
  let i = 0
  const chunks = []

  while (offset < data.length) {
    const chunk = data.slice(offset, offset + chunkSize)
    offset += chunkSize
    chunks.push({
      i,
      chunk,
      finished: offset >= data.length,
    })
    ++i
  }

  return chunks
}

export function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export async function readAsArrayBuffer(source: File | Blob) {
  return await new Promise<ArrayBuffer>((resolve, reject) => {
    const fileReader = new FileReader()
    fileReader.onload = event => {
      if (event.target) {
        resolve(event.target!.result as ArrayBuffer)
      } else {
        reject(new Error('[readAsArrayBuffer] empty source'))
      }
    }
    fileReader.onerror = reject
    fileReader.readAsArrayBuffer(source)
  })
}
