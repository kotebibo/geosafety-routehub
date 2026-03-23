interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ message = 'იტვირთება...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
      <div className="text-center">
        <div className={`animate-spin ${sizeClasses[size]} mb-4`}>⚙️</div>
        {message && <p className="text-text-secondary">{message}</p>}
      </div>
    </div>
  )
}
