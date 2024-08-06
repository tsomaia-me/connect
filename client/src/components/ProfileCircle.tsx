import { PropsWithChildren } from 'react'
import classNames from 'classnames'

export interface ProfileCircleProps extends PropsWithChildren {
  className?: string
  zIndex?: number
}

export function ProfileCircle(props: ProfileCircleProps) {
  const { className, zIndex, children } = props

  return (
    <div
      className={classNames(
        'relative inline-block w-10 h-10 bg-gray-700 text-white rounded-full flex items-center justify-center text-lg font-semibold border-2 border-white',
        className
      )}
      style={{ zIndex }}
    >
      {children}
    </div>
  )
}
