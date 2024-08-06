import classNames from 'classnames'

export interface PenColorPickerProps {
  isOpen: boolean
  selectedColor: string
  onSelectColor: (color: string) => void
}

const colorMap: Record<string, string> = {
  'bg-white': '#FFFFFF',
  'bg-red-500': '#EF4444',
  'bg-green-500': '#10B981',
  'bg-blue-500': '#3B82F6',
  'bg-purple-500': '#8B5CF6',
  'bg-pink-500': '#EC4899',
};

export function PenColorPicker(props: PenColorPickerProps) {
  const { isOpen, selectedColor, onSelectColor } = props

  return (
    <div className={classNames(
      'flex flex-col gap-4 h-[320px] justify-end',
      isOpen ? 'animate-open' : 'animate-close'
    )}>
      {Object.keys(colorMap).map((color, index) => (
        <div
          key={index}
          className={classNames(
            'w-8 h-8 rounded-full cursor-pointer border-4',
            color,
            selectedColor === colorMap[color] ? 'border-blue-500' : 'border-white',
            `transition-transform duration-300 delay-${index * 100}`,
          )}
          onClick={() => onSelectColor(colorMap[color])}
        ></div>
      ))}
    </div>
  )
}
