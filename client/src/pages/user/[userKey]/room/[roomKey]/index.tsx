'use client'

import { useParams } from 'next/navigation'
import { SocketProvider } from '@/components/SocketProvider'
import { DataSubscriptionContainer } from '@/components/DataSubscriptionContainer'
import { BASE_URL } from '@/api/constants'

export default function RoomPage() {
  const params = useParams()

  return (
    <SocketProvider url={BASE_URL}>
      {params?.userKey && params.roomKey && (
        <DataSubscriptionContainer
          userKey={params.userKey.toString()}
          roomKey={params.roomKey.toString()}
        />
      )}
    </SocketProvider>
  )
}
