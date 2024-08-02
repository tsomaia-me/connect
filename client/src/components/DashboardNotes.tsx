import { useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import classNames from 'classnames'
import { getRelativePoint } from '@/components/shared/utils'
import { Point } from '@/components/shared/types'

export interface DashboardNotesProps {
  isActive: boolean
  controlPosition: [number, number]
}

export interface Note {
  id: string
  width: number
  height: number
  relativePoint: Point
  content: string
}

export function DashboardNotes(props: DashboardNotesProps) {
  const { isActive, controlPosition } = props
  const [mode, setMode] = useState<'create' | 'view'>('view')
  const boardRef = useRef<HTMLDivElement | null>(null)
  const newNoteRef = useRef<HTMLDivElement | null>(null)
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    if (isActive) {
      setMode('create')
    }
  }, [isActive])

  useEffect(() => {
    if (mode !== 'create' || !newNoteRef.current || !boardRef.current) {
      return
    }

    const boardEl = boardRef.current!
    const newNoteEl = newNoteRef.current!
    setPosition(controlPosition)

    function setPosition([x, y]) {
      const left = x - (newNoteEl.offsetWidth / 2)
      const top = y - (newNoteEl.offsetHeight / 2)
      newNoteEl.style.left = `${left}px`
      newNoteEl.style.top = `${top}px`
    }

    function onMouseMove(event: MouseEvent) {
      setPosition([event.clientX, event.clientY])
    }

    function onBoardClick(event: MouseEvent) {
      setNotes(existingNotes => [
        ...existingNotes,
        {
          id: uuid(),
          width: 224,
          height: 224,
          relativePoint: getRelativePoint([event.clientX, event.clientY] as Point, {
            width: boardEl.offsetWidth,
            height: boardEl.offsetHeight,
          }),
          content: '',
        } as Note,
      ])
    }

    window.addEventListener('mousemove', onMouseMove)
    boardEl.addEventListener('click', onBoardClick, {
      once: true
    })

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('click', onBoardClick)
    }
  }, [mode, controlPosition])

  return (
    <div
      ref={boardRef}
      className={
        classNames(
          'absolute top-0 left-0 right-0 bottom-0 w-full h-full pointer-events-none',
        )
      }
    >
      {controlPosition}
      {mode === 'create' && (
        <div
          ref={newNoteRef}
          className="absolute bg-gray-600 border border-gray-700 rounded-2xl w-56 h-56 cursor-grabbing pointer-events-auto animate-enter-in"
        ></div>
      )}
      hello
    </div>
  )
}
