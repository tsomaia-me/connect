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
import { number } from 'prop-types'

export interface DashboardProps {
}

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
  const drawingRef = useRef<[number, number][]>([])
  const userId = user.id

  sendRef.current = send
  broadcastRef.current = broadcast
  addPeerEventListenerRef.current = addPeerEventListener
  removePeerEventListenerRef.current = removePeerEventListener

  useEffect(() => {
    const canvasContainer = canvasContainerRef.current
    const canvas = canvasRef.current

    if (!canvasContainer || !canvas) {
      return
    }

    const selfIndex = room.participants.map((participant) => participant.user.id).indexOf(user.id)
    const { width, height } = canvasContainer.getBoundingClientRect()
    canvas.width = width
    canvas.height = height
    let widthToHeightRatio = width / height

    const ctx = canvas.getContext('2d')
    let isMouseActive = false
    // let [lastX, lastY] = [0, 0]
    let points = []
    const peerPoints = new Map<string, [number, number][]>()
    let lastTimestamp = 0

    function getRelativePoint([x, y]) {
      return [x / canvas!.width, y / canvas!.height]
    }

    function getAbsolutePoint([x, y]) {
      return [x * canvas!.width, y * canvas!.height]
    }

    function onWindowResize() {
      const { width, height } = canvasContainer!.getBoundingClientRect()
      canvas!.width = width
      canvas!.height = height
      widthToHeightRatio = width / height
    }

    function draw(points: [number, number][]) {
      if (points.length < 3) {
        return
      }

      ctx.lineWidth = 2
      ctx.strokeStyle = 'white'
      ctx.beginPath()
      ctx.moveTo(points[0][0], points[0][1])

      for (let i = 1; i < points.length - 2; ++i) {
        const xc = (points[i][0] + points[i + 1][0]) / 2
        const yc = (points[i][1] + points[i + 1][1]) / 2
        ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc)
      }

      ctx.quadraticCurveTo(
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

    function onDelta(callback: (timestamp: number) => void, delta: number) {
      const timestamp = performance.now()
      const previousTimestamp = lastTimestamp
      lastTimestamp = timestamp

      if (lastTimestamp) {
        const deltaTime = timestamp - previousTimestamp

        if (deltaTime < 16) {
          callback(timestamp)
        }
      } else {
        callback(timestamp)
      }
    }

    function onMouseDown(event: { offsetX: number; offsetY: number }) {
      isMouseActive = true
      const point = [event.offsetX, event.offsetY]
      points = [point]
      drawingRef.current.push(getRelativePoint(point))
      broadcastRef.current({
        event: 'drawstart',
        payload: {
          point: getRelativePoint(points[0]),
        },
      })
    }

    function drawPoint([x, y]) {
      requestAnimationFrame(() => {
        const point = [x, y]
        points.push(point)
        onDelta(timestamp => {
          draw(points)
          drawingRef.current.push(getRelativePoint(point))

          broadcastRef.current({
            event: 'draw',
            payload: {
              point: getRelativePoint(point),
            },
          })

          lastTimestamp = timestamp
        }, 16)
      })
    }

    function onMouseMove(event: { offsetX: number; offsetY: number }) {
      if (isMouseActive) {
        drawPoint([event.offsetX, event.offsetY])
      }
    }

    function onMouseUp() {
      isMouseActive = false
      points = []
    }

    function onPeerJoined(event: PeerEvent) {
      if (drawingRef.current.length > 0) {
        console.log('sending drawing to new peer:', room.participants.find(p => p.user.id === event.peerId)?.user.username, drawingRef.current)

        sendRef.current(event.peerId, {
          event: 'drawing',
          payload: {
            drawing: drawingRef.current,
          },
        })
      }
    }

    function onDrawing(event: PeerEvent) {
      console.log('received drawing from',  room.participants.find(p => p.user.id === event.peerId)?.user.username, event.payload.drawing)
      drawingRef.current = event.payload.drawing
      restoreDrawing()
    }

    function restoreDrawing() {
      points = drawingRef.current.map(getAbsolutePoint)
      points.forEach(drawPoint)
    }

    function onPeerDrawStart(event: PeerEvent) {
      peerPoints.set(event.peerId, [getAbsolutePoint(event.payload.point)])
    }

    function onPeerDraw(event: PeerEvent) {
      const point = getAbsolutePoint(event.payload.point)

      requestAnimationFrame(() => {
        const points = peerPoints.get(event.peerId) ?? []
        points.push(point)
        onDelta(timestamp => {
          draw(points)
          lastTimestamp = timestamp
        }, 16)
      })
    }

    function onPeerDrawEnd(event: PeerEvent) {
      peerPoints.set(event.peerId, [])
    }

    window.addEventListener('resize', onWindowResize)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)

    addPeerEventListenerRef.current('joined', onPeerJoined)
    addPeerEventListenerRef.current('drawing', onDrawing)
    addPeerEventListenerRef.current('drawstart', onPeerDrawStart)
    addPeerEventListenerRef.current('draw', onPeerDraw)
    addPeerEventListenerRef.current('drawend', onPeerDrawEnd)

    restoreDrawing()

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
  }, [userId, room])

  return (
    <div ref={canvasContainerRef}
         className="flex flex-row justify-center items-center h-full dark:bg-gray-900 relative">
      <canvas
        className="bg-red-500"
        ref={canvasRef}
        width={500}
        height={500}
      ></canvas>

      <div className="flex flex-col gap-6 text-white absolute bottom-0">

        <Input value={roomKey} readOnly={true}/>
        There {peers.size > 1 ? 'are' : 'is'} {peers.size} other peer{peers.size > 1 ? 's' : ''} in the room
      </div>
    </div>
  )
}
