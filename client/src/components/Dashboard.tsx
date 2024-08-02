import { Input } from '@/shared/Input'
import { useEffect, useRef } from 'react'
import {
  PeerEvent,
  useAddPeerEventListener,
  useBroadcaster,
  usePeers,
  useRemovePeerEventListener, useRoom,
  useRoomKey, useSender, useUser
} from '@/components/RoomControlsProvider'
import { Room, User } from '@/app.models'

export interface DashboardProps {
}

export type Point = [x: number, y: number, time: number]

export function Dashboard(props: DashboardProps) {
  const user = useUser()
  const room = useRoom()
  const roomKey = useRoomKey()
  const peers = usePeers()
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
  const drawingRef = useRef<Point[][]>([])
  const roomRef = useRef<Room>(room)
  const userRef = useRef<User>(user)

  sendRef.current = send
  broadcastRef.current = broadcast
  roomRef.current = room
  userRef.current = user
  addPeerEventListenerRef.current = addPeerEventListener
  removePeerEventListenerRef.current = removePeerEventListener

  useEffect(() => {
    const canvasContainer = canvasContainerRef.current
    const canvas = canvasRef.current

    if (!canvasContainer || !canvas) {
      return
    }

    const animationTasks: Array<() => void> = []
    const selfIndex = roomRef.current.participants.map((participant) => participant.user.id).indexOf(user.id)
    const { width, height } = canvasContainer.getBoundingClientRect()
    canvas.width = width
    canvas.height = height
    let widthToHeightRatio = width / height

    const ctx = canvas.getContext('2d')
    let isMouseActive = false
    // let [lastX, lastY] = [0, 0]
    let points = []
    const peerPoints = new Map<string, Point[]>()
    let lastTimestamp = 0

    function schedule(task: () => void) {
      animationTasks.unshift(task)
    }

    function getRelativePoint([x, y, time]): Point {
      return [x / canvas!.width, y / canvas!.height, time] as Point
    }

    function getAbsolutePoint([x, y, time]): Point {
      return [Math.round(x * canvas!.width), Math.round(y * canvas!.height), time] as Point
    }

    function onWindowResize() {
      const { width, height } = canvasContainer!.getBoundingClientRect()
      canvas!.width = width
      canvas!.height = height
      widthToHeightRatio = width / height
    }

    function draw(points: Point[]) {
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
      isMouseActive = true
      const point = [event.offsetX, event.offsetY, performance.now()]
      points = [point]
      drawingRef.current.push([getRelativePoint(point)])
      broadcastRef.current({
        event: 'drawstart',
        payload: {
          point: getRelativePoint(points[0]),
        },
      })
    }

    function onMouseMove(event: { offsetX: number; offsetY: number }) {
      if (isMouseActive) {
        const point = [event.offsetX, event.offsetY, performance.now()]

        points.push(point)
        schedule(() => draw(points))
        drawingRef.current[drawingRef.current.length - 1]?.push(getRelativePoint(point))
        broadcastRef.current({
          event: 'draw',
          payload: {
            point: getRelativePoint(point),
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
      ctx.clearRect(0, 0, canvas!.width ?? 0, canvas!.height ?? 0)
      ctx.restore()

      for (const fragment of drawingRef.current) {
        if (fragment.length > 1) {
          peerPoints.set(event.peerId, [getAbsolutePoint(fragment[0])])
          for (let i = 1; i < fragment.length; ++i) {
            const point = getAbsolutePoint(fragment[i])
            const points = peerPoints.get(event.peerId) ?? []
            points.push(point)
            draw(points)
          }
          peerPoints.set(event.peerId, [])
        }
      }
    }

    function onPeerDrawStart(event: PeerEvent) {
      peerPoints.set(event.peerId, [getAbsolutePoint(event.payload.point)])
    }

    function onPeerDraw(event: PeerEvent) {
      const point = getAbsolutePoint(event.payload.point)
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
    <div ref={canvasContainerRef}
         className="flex flex-row justify-center items-center h-full dark:bg-gray-900 relative">
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
      ></canvas>

      <div className="flex flex-col gap-6 text-white absolute bottom-0">

        <Input value={roomKey} readOnly={true}/>
        {peers.size === 0 ? 'You are the only one in the room' : `There are ${peers.size + 1} people in the room`}
      </div>
    </div>
  )
}
