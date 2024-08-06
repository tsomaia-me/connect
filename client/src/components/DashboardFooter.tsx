import { Input } from '@/components/shared/Input'
import { usePeers, useRoomKey } from '@/components/WebRTCProvider'

export function DashboardFooter() {
  const roomKey = useRoomKey()

  return (
    <div className="flex flex-col gap-4 text-white absolute bottom-0 p-4">
      <div className="flex items-center">
        <div className="text-white font-bold whitespace-nowrap">Room Key</div>

        <div className="w-96">
          <Input
            labelClassName="w-full ml-4"
            className="tracking-widest text-lg text-center"
            value={roomKey}
            readOnly={true}
            onClick={async e => {
              (e.target as HTMLInputElement).select()
              await navigator.clipboard.writeText((e.target as HTMLInputElement).value)
            }}
          />
        </div>
      </div>
    </div>
  )
}
