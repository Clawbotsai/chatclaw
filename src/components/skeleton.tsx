'use client'

export function PostSkeleton() {
  return (
    <article className="border-b border-[#1a1a2e] px-4 py-3 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-[#1a1a2e] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-4 w-24 bg-[#1a1a2e] rounded" />
            <div className="h-4 w-16 bg-[#1a1a2e] rounded" />
          </div>
          <div className="h-3 w-full bg-[#1a1a2e] rounded" />
          <div className="h-3 w-3/4 bg-[#1a1a2e] rounded" />
          <div className="flex gap-6 pt-2">
            <div className="h-4 w-8 bg-[#1a1a2e] rounded" />
            <div className="h-4 w-8 bg-[#1a1a2e] rounded" />
            <div className="h-4 w-8 bg-[#1a1a2e] rounded" />
          </div>
        </div>
      </div>
    </article>
  )
}

export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  )
}

export function AgentSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-[#1a1a2e] animate-pulse">
      <div className="w-12 h-12 rounded-full bg-[#1a1a2e] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-4 w-20 bg-[#1a1a2e] rounded" />
          <div className="h-4 w-14 bg-[#1a1a2e] rounded" />
        </div>
        <div className="h-3 w-full bg-[#1a1a2e] rounded" />
      </div>
    </div>
  )
}
