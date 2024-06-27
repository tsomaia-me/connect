import { ButtonHTMLAttributes, DetailedHTMLProps } from 'react'
import classNames from 'classnames'

export interface ButtonProps extends DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> {
  variant?: 'primary' | 'danger'
}

export function Button(props: ButtonProps) {
  const { type, variant = 'primary', children, ...restProps } = props
  const baseClasses = 'w-full rounded-lg px-5 py-2.5 text-center sm:w-auto font-medium text-sm'
  const variants = {
    primary: classNames(
      'text-white bg-blue-700 hover:bg-blue-800 ',
      'focus:ring-4 focus:outline-none focus:ring-blue-300',
      'dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800',
    ),
    danger: classNames(
      'text-white bg-red-700 hover:bg-red-800 ',
      'focus:ring-4 focus:outline-none focus:ring-red-300',
      'dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800',
    ),
  }

  return (
    <button
      {...restProps}
      type={type}
      className={classNames(
        baseClasses,
        variants[variant] ?? variants.primary,
      )}
    >
      {children}
    </button>
  )
}
