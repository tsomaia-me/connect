import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const SocketContext = createContext({} as Socket)

export interface SocketProviderProps extends PropsWithChildren {
  url: string
}

export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider(props: SocketProviderProps) {
  const { url, children } = props
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const socket = io(url, { secure: true })
    setSocket(socket)

    return () => {
      socket.close()
    }
  }, [url])

  return (
    <>
      {socket && (
        <SocketContext.Provider value={socket}>
          {children}
        </SocketContext.Provider>
      )}
    </>
  )
}
