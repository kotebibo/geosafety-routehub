export function DebtorsSkeleton() {
  return (
    <div className="p-6 space-y-5 max-w-[1500px] mx-auto animate-pulse">
      <div className="h-8 w-64 bg-bg-secondary rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-bg-secondary rounded-xl" />
        ))}
      </div>
      <div className="h-10 w-full bg-bg-secondary rounded-lg" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 bg-bg-secondary rounded-lg" />
      ))}
    </div>
  )
}
