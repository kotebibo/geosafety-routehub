interface SkeletonProps {
  variant?: 'bar' | 'circle' | 'rect'
  width?: string | number
  height?: string | number
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({
  variant = 'rect',
  width,
  height,
  className = '',
  style,
}: SkeletonProps) {
  const shape = variant === 'circle' ? 'rounded-full' : variant === 'bar' ? 'rounded' : 'rounded-lg'

  return <div className={`skeleton ${shape} ${className}`} style={{ width, height, ...style }} />
}
