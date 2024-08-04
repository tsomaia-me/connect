import { useEffect, useRef } from 'react'
import {
  PeerEvent,
  useAddPeerEventListener,
  useBroadcaster,
  useRemovePeerEventListener,
  useRoom,
  useSender,
  useUser
} from '@/components/RoomControlsProvider'
import { Room, User } from '@/app.models'
import { TimePoint } from '@/components/shared/types'
import { getAbsolutePoint, getRelativePoint } from '@/components/shared/utils'

export interface DrawingCanvasProps {
  isActive: boolean
}

export function DrawingCanvas(props: DrawingCanvasProps) {
  const { isActive } = props
  const user = useUser()
  const room = useRoom()
  const send = useSender()
  const broadcast = useBroadcaster()
  const addPeerEventListener = useAddPeerEventListener()
  const removePeerEventListener = useRemovePeerEventListener()
  const canvasContainerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sendRef = useRef(send)
  const broadcastRef = useRef(broadcast)
  const addPeerEventListenerRef = useRef(addPeerEventListener)
  const removePeerEventListenerRef = useRef(removePeerEventListener)
  const isActiveRef = useRef<boolean>(isActive)
  const drawingRef = useRef<TimePoint[][]>([])
  const roomRef = useRef<Room>(room)
  const userRef = useRef<User>(user)

  isActiveRef.current = isActive
  sendRef.current = send
  broadcastRef.current = broadcast
  roomRef.current = room
  userRef.current = user
  addPeerEventListenerRef.current = addPeerEventListener
  removePeerEventListenerRef.current = removePeerEventListener

  useEffect(() => {

    if (!canvasContainerRef.current || !canvasRef.current) {
      return
    }

    const canvasContainer = canvasContainerRef.current!
    const canvas = canvasRef.current!
    const animationTasks: Array<() => void> = []
    const { width, height } = canvasContainer.getBoundingClientRect()
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')!

    if (!ctx) {
      return
    }

    let isMouseActive = false
    let points: TimePoint[] = []
    const peerPoints = new Map<string, TimePoint[]>()

    function schedule(task: () => void) {
      animationTasks.unshift(task)
    }

    function onWindowResize() {
      const { width, height } = canvasContainer.getBoundingClientRect()
      canvas.width = width
      canvas.height = height
      redraw()
    }

    function draw(points: TimePoint[]) {
      if (points.length < 4) {
        return
      }

      ctx.lineWidth = 2
      ctx.strokeStyle = 'white'
      ctx.beginPath()
      ctx.moveTo(points[0][0], points[0][1])

      for (let i = 2; i < points.length - 3; ++i) {
        const cp1x = (points[i][0] + points[i + 1][0]) / 2
        const cp1y = (points[i][1] + points[i + 1][1]) / 2
        const cp2x = (points[i + 1][0] + points[i + 2][0]) / 2
        const cp2y = (points[i + 1][1] + points[i + 2][1]) / 2
        ctx.bezierCurveTo(
          cp1x,
          cp1y,
          cp2x,
          cp2y,
          points[i][0],
          points[i][1],
        )
      }

      ctx.bezierCurveTo(
        points[points.length - 3][0],
        points[points.length - 3][1],
        points[points.length - 2][0],
        points[points.length - 2][1],
        points[points.length - 1][0],
        points[points.length - 1][1],
      )
      ctx.stroke()
      const lastPoint = points[points.length - 1]
      points.splice(0, points.length)
      points.push(lastPoint)
    }

    function onMouseDown(event: { offsetX: number; offsetY: number }) {
      if (!isActiveRef.current) {
        return
      }

      isMouseActive = true
      const point: TimePoint = [event.offsetX, event.offsetY, performance.now()]
      points = [point]
      drawingRef.current.push([getRelativePoint(point, canvas)])
      broadcastRef.current({
        event: 'drawstart',
        payload: {
          point: getRelativePoint(points[0], canvas),
        },
      })
    }

    function onMouseMove(event: { offsetX: number; offsetY: number }) {
      if (isMouseActive) {
        const point: TimePoint = [event.offsetX, event.offsetY, performance.now()]

        points.push(point)
        schedule(() => draw(points))
        drawingRef.current[drawingRef.current.length - 1]?.push(getRelativePoint(point, canvas))
        broadcastRef.current({
          event: 'draw',
          payload: {
            point: getRelativePoint(point, canvas),
          },
        })
      }
    }

    function onMouseUp() {
      isMouseActive = false
      points = []
    }

    function onPeerJoined(event: PeerEvent) {
      if (drawingRef.current.length > 0) {
        console.log('sending drawing to new peer:', roomRef.current.participants.find(p => p.user.id === event.peerId)?.user.username, drawingRef.current)

        sendRef.current(event.peerId, {
          event: 'drawing',
          payload: {
            drawing: drawingRef.current,
          },
        })
      }
    }

    function onDrawing(event: PeerEvent) {
      console.log('received drawing from', roomRef.current.participants.find(p => p.user.id === event.peerId)?.user.username, event.payload.drawing)
      drawingRef.current = event.payload.drawing

      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width ?? 0, canvas.height ?? 0)
      ctx.restore()

      for (const fragment of drawingRef.current) {
        if (fragment.length > 1) {
          peerPoints.set(event.peerId, [getAbsolutePoint(fragment[0], canvas)])
          for (let i = 1; i < fragment.length; ++i) {
            const point = getAbsolutePoint(fragment[i], canvas)
            const points = peerPoints.get(event.peerId) ?? []
            points.push(point)
            draw(points)
          }
          peerPoints.set(event.peerId, [])
        }
      }
    }

    function redraw() {
      for (const fragment of drawingRef.current) {
        if (fragment.length > 1) {
          points = [getAbsolutePoint(fragment[0], canvas)]
          for (let i = 1; i < fragment.length; ++i) {
            const point = getAbsolutePoint(fragment[i], canvas)
            points.push(point)
            draw(points)
          }
          points = []
        }
      }
    }

    function onPeerDrawStart(event: PeerEvent) {
      peerPoints.set(event.peerId, [getAbsolutePoint(event.payload.point as TimePoint, canvas)])
    }

    function onPeerDraw(event: PeerEvent) {
      const point = getAbsolutePoint(event.payload.point as TimePoint, canvas)
      const points = peerPoints.get(event.peerId) ?? []
      points.push(point)
      schedule(() => draw(points))
    }

    function onPeerDrawEnd(event: PeerEvent) {
      peerPoints.set(event.peerId, [])
    }

    function runAnimationLoop() {
      let lastFrame = performance.now()

      return requestAnimationFrame(function frame() {
        if (performance.now() - lastFrame >= 16) {
          const task = animationTasks.pop()
          task?.()
        }

        requestAnimationFrame(frame)
      })
    }

    runAnimationLoop()

    window.addEventListener('resize', onWindowResize)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)

    addPeerEventListenerRef.current('joined', onPeerJoined)
    addPeerEventListenerRef.current('drawing', onDrawing)
    addPeerEventListenerRef.current('drawstart', onPeerDrawStart)
    addPeerEventListenerRef.current('draw', onPeerDraw)
    addPeerEventListenerRef.current('drawend', onPeerDrawEnd)

    return () => {
      window.removeEventListener('resize', onWindowResize)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)

      removePeerEventListenerRef.current('joined', onPeerJoined)
      removePeerEventListenerRef.current('drawing', onDrawing)
      removePeerEventListenerRef.current('drawstart', onPeerDrawStart)
      removePeerEventListenerRef.current('draw', onPeerDraw)
      removePeerEventListenerRef.current('drawend', onPeerDrawEnd)
    }
  }, [])

  return (
    <div ref={canvasContainerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
      ></canvas>
    </div>
  )
}
