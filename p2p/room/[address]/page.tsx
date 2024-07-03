'use client'

import ConnectContainer from '../../ConnectContainer'

export default function RoomPage({ params }: { params: { address: string }}) {
  return (
    <ConnectContainer address={params.address}/>
  )
}
