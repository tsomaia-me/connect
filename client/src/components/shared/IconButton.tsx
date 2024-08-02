import classNames from 'classnames'
import { HtmlButtonProps } from '@/components/shared/types'

export interface IconButtonProps extends HtmlButtonProps {
  isActive?: boolean
}

export function IconButton(props: IconButtonProps) {
  const { isActive = false, type = 'button', className, children, ...restProps } = props

  return (
    <button
      type={type as HtmlButtonProps['type']}
      className={
        classNames(
          'p-2.5 inline-flex items-center me-2',
          'border border-blue-700 rounded-full',
          'text-blue-700 font-medium text-sm text-center',
          'dark:border-blue-500 dark:text-blue-500',
          'hover:bg-blue-700 hover:text-white dark:hover:text-white dark:hover:bg-blue-500',
          'focus:ring-4 focus:outline-none focus:ring-blue-300dark:focus:ring-blue-800',
          isActive && 'bg-blue-500 ring-blue-800',
          className,
        )
      }
      {...restProps}
    >
      {children}
    </button>
  )
}
