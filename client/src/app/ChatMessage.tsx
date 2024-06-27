import classNames from 'classnames'
import { PeerMessageEvent } from '@/p2p/types'

export interface ChatMessageProps {
  address: string
  message: PeerMessageEvent
}

export function ChatMessage(props: ChatMessageProps) {
  const { address, message } = props
  const isLocal = message.sender === address
  const variant: 'primary' | 'secondary' = isLocal ? 'secondary' : 'primary'
  const variants = {
    primary: {
      container: 'border-blue-200 bg-blue-100 dark:bg-blue-700 rounded-e-xl rounded-es-xl',
      avatar: 'bg-blue-600',
      sender: 'text-blue-900 dark:text-white',
      time: 'text-blue-500 dark:text-blue-400',
      content: 'text-blue-900 dark:text-white',
      status: 'text-blue-500 dark:text-blue-400',
    },
    secondary: {
      container: 'border-gray-200 bg-gray-100 dark:bg-gray-700 rounded-s-xl rounded-ee-xl',
      avatar: 'bg-gray-600',
      sender: 'text-gray-900 dark:text-white',
      time: 'text-gray-500 dark:text-gray-400',
      content: 'text-gray-900 dark:text-white',
      status: 'text-gray-500 dark:text-gray-400',
    },
  }[variant]

  return (
    <div className="grid justify-items-stretch w-full">
      <div className={classNames(
        'flex items-start gap-2.5 w-4/5',
        isLocal && 'justify-self-end',
      )}>
        {!isLocal && (
          <div className={classNames(
            'w-8 min-w-8 h-8 rounded-full flex justify-center items-center text-white',
            variants.avatar
          )}>
            {isLocal ? 'M' : 'O'}
          </div>
        )}

        <div className={classNames(
          'flex flex-col w-full leading-1.5 p-2',
          variants.container,
        )}>
          {/*<div className="flex items-center space-x-2 rtl:space-x-reverse">*/}
          {/*  <span className={classNames('text-sm font-semibold', variants.sender)}>{*/}
          {/*    isLocal ? 'Me: ' : 'Other: '*/}
          {/*  }</span>*/}
          {/*  <span className={classNames('text-sm font-normal', variants.time)}>18:20</span>*/}
          {/*</div>*/}

          <p className={classNames('text-sm font-normal py-2.5', variants.content)}>
            {message.data}
          </p>

          {/*{isLocal && (*/}
          {/*  <span className={classNames('text-sm font-normal', variants.status)}>Sent</span>*/}
          {/*)}*/}
        </div>

        {isLocal && (
          <div className={classNames(
            'w-8 min-w-8 h-8 rounded-full flex justify-center items-center text-white',
            variants.avatar
          )}>
            {isLocal ? 'M' : 'O'}
          </div>
        )}
      </div>
    </div>
  )
}
