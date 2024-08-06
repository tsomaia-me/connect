import classNames from 'classnames'

export interface PenSizePickerProps {
  isOpen: boolean
  selectedSize: number
  onSelectSize: (Size: number) => void
}

const SizeMap = {
  'thin': 2,
  'medium': 4,
  'thick': 6,
};

const thinIcon = (
  <div className="w-1 h-1 bg-white rounded-full"></div>
)

const mediumIcon = (
  <div className="w-2 h-2 bg-white rounded-full"></div>
)

const thickIcon = (
  <div className="w-4 h-4 bg-white rounded-full"></div>
)

const sizes = {
  thick: thickIcon,
  medium: mediumIcon,
  thin: thinIcon,
}

export function PenSizePicker(props: PenSizePickerProps) {
  const { isOpen, selectedSize, onSelectSize } = props

  return (
    <div className={classNames(
      'flex flex-col gap-4 h-[220px]',
      isOpen ? 'animate-open' : 'animate-close'
    )}>
      {Object.keys(SizeMap).map((size, index) => (
        <div
          key={index}
          className={classNames(
            'w-8 h-8 rounded-full cursor-pointer border-4 border-white text-white flex justify-center items-center',
            size,
            selectedSize === SizeMap[size] && 'border-sky-600',
            `transition-transform duration-300 delay-${index * 100}`,
          )}
          onClick={() => onSelectSize(SizeMap[size])}
        >
          {sizes[size]}
        </div>
      ))}
    </div>
  )
}
