import { useWebRTCContext } from '@/components/WebRTCProvider'
import { ProfileCircle } from '@/components/ProfileCircle'

export function DashboardHeader() {
  const { room } = useWebRTCContext()
  const bgOptions = [
    'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-gray-500',
  ];
  const displayedParticipants = room.participants.slice(0, 10)
  const additionalCount = room.participants.length - displayedParticipants.length
  const baseZIndex = 100

  return (
    <div className="flex flex-row gap-4 text-white absolute top-0 p-4">
      <div className="flex -space-x-3">
        {displayedParticipants.map((participant, index) => (
          <ProfileCircle
            key={participant.connectionId}
            className={bgOptions[index % bgOptions.length]}
            zIndex={baseZIndex + index}
          >
            {participant.user.username[0] + participant.user.username[1]}
          </ProfileCircle>
        ))}
        {additionalCount > 0 && (
          <ProfileCircle className="bg-gray-800" style={{ zIndex: baseZIndex + displayedParticipants.length }}>
            +{additionalCount}
          </ProfileCircle>
        )}
      </div>
    </div>
  )
}
