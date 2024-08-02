import { ChangeEvent, ReactElement, useCallback } from 'react'
import { Input, InputProps } from './Input'
import { FieldParams } from './types'

export interface TextInputProps extends InputProps {
  type?: 'text'
  field: FieldParams<string>
}

export interface NumberInputProps extends InputProps {
  type: 'number'
  field: FieldParams<number>
}

export type InputFieldProps =
  | TextInputProps
  | NumberInputProps

export function InputField(props: NumberInputProps): ReactElement
export function InputField(props: TextInputProps): ReactElement
export function InputField(props: InputFieldProps): ReactElement {
  const { type, field, ...restProps } = props
  const onChange = field.onChange as (value: string | number) => void
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange(
      type === 'number'
        ? Number(event.target.value)
        : event.target.value
    ),
    [type, onChange],
  )
  const I = Input as any

  return (
    <I
      {...restProps as InputProps}
      type={type}
      value={field.value}
      onChange={handleChange}
    />
  )
}
