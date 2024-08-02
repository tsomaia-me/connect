import { Box, Point, TimePoint } from '@/components/shared/types'

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
