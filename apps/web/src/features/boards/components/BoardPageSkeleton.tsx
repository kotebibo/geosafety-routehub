export function BoardPageSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-secondary animate-pulse">
      {/* Skeleton Header */}
      <div className="flex-shrink-0 bg-bg-primary border-b border-border-light">
        <div className="w-full mx-auto px-4 md:px-6 py-4">
          {/* Top Bar Skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 w-32 bg-[#e6e9ef] rounded" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-[#e6e9ef] rounded-md" />
              <div className="h-8 w-20 bg-[#e6e9ef] rounded-md" />
              <div className="h-8 w-24 bg-[#e6e9ef] rounded-md" />
            </div>
          </div>
          {/* Board Title Skeleton */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#d0d4e4]" />
            <div>
              <div className="h-6 w-48 bg-[#d0d4e4] rounded mb-2" />
              <div className="h-3 w-72 bg-[#e6e9ef] rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Skeleton Toolbar */}
      <div className="flex-shrink-0 bg-bg-primary border-b border-border-light px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-56 bg-[#e6e9ef] rounded-md" />
          <div className="h-8 w-24 bg-[#e6e9ef] rounded-md" />
          <div className="h-8 w-20 bg-[#e6e9ef] rounded-md" />
        </div>
      </div>

      {/* Skeleton Table */}
      <div className="flex-1 px-4 md:px-6 py-4">
        {/* Group Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-5 bg-[#579bfc] rounded opacity-40" />
          <div className="h-5 w-32 bg-[#579bfc] rounded opacity-40" />
          <div className="h-4 w-16 bg-[#e6e9ef] rounded" />
        </div>

        {/* Table Header */}
        <div className="border border-[#e6e9ef] rounded-t-lg bg-white">
          <div className="flex items-center h-9 border-b border-[#e6e9ef] px-3 gap-4">
            <div className="h-3 w-4 bg-[#e6e9ef] rounded" />
            <div className="h-3 w-32 bg-[#d0d4e4] rounded" />
            <div className="h-3 w-24 bg-[#e6e9ef] rounded" />
            <div className="h-3 w-20 bg-[#e6e9ef] rounded" />
            <div className="h-3 w-28 bg-[#e6e9ef] rounded" />
            <div className="h-3 w-20 bg-[#e6e9ef] rounded" />
            <div className="h-3 w-24 bg-[#e6e9ef] rounded" />
          </div>

          {/* Table Rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center h-9 border-b border-[#e6e9ef] px-3 gap-4">
              <div className="h-3 w-4 bg-[#f0f1f3] rounded" />
              <div className="h-3 bg-[#f0f1f3] rounded" style={{ width: `${120 + (i % 3) * 30}px` }} />
              <div className="h-5 w-16 bg-[#e6e9ef] rounded-full" />
              <div className="h-3 w-20 bg-[#f0f1f3] rounded" />
              <div className="h-3 w-24 bg-[#f0f1f3] rounded" />
              <div className="h-3 w-16 bg-[#f0f1f3] rounded" />
              <div className="h-3 w-20 bg-[#f0f1f3] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
