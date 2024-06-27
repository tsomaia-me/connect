'use client'

import ConnectContainer from '@/app/ConnectContainer'
import { useRouter } from 'next/router'

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="flex flex-row justify-center items-center h-full dark:bg-gray-900">
      {router.pathname}
      <ConnectContainer/>
    </div>
  )
}
