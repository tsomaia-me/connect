import {
  ChangeEvent,
  DetailedHTMLProps,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactElement,
  useCallback, useEffect,
  useState
} from 'react'

export interface FieldParams<T extends string | number | null> {
  value: T
  onChange: (value: T) => void
}

export function useField<T extends string | number | null>(initialValue: T): FieldParams<T> {
  const [value, setValue] = useState<T>(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return {
    value,
    onChange: setValue,
  }
}

export interface TextInputProps extends DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
  type?: 'text'
  field: FieldParams<string>
  label?: string;
  placeholder?: string;
}

export interface NumberInputProps extends DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
  type: 'number'
  field: FieldParams<number>
  label?: string;
  placeholder?: string;
}

export type InputProps =
  | TextInputProps
  | NumberInputProps

export function Input(props: NumberInputProps): ReactElement
export function Input(props: TextInputProps): ReactElement
export function Input(props: InputProps): ReactElement {
  const { type, field, label, placeholder } = props
  const onChange = field.onChange as (value: string | number) => void
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange(
      type === 'number'
        ? Number(event.target.value)
        : event.target.value
    ),
    [type, onChange],
  )

  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-900 dark:text-white">{label}</span>
      <input
        type={type}
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        placeholder={placeholder}
        value={field.value}
        onChange={handleChange}
      />
    </label>
  )
}
