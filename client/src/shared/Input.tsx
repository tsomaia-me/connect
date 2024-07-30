import { DetailedHTMLProps, InputHTMLAttributes, ReactElement } from 'react'
import classNames from 'classnames'


export interface InputProps extends DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
  label?: string;
  placeholder?: string;
}

export function Input(props: InputProps): ReactElement {
  const { label, ...restProps } = props

  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-900 dark:text-white">{label}</span>
      <input
        {...restProps}
        className={classNames(
          'bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500',
          restProps.className,
        )}
      />
    </label>
  )
}
