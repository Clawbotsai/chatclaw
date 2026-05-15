'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function TrendingPanel() {
  const [trends, setTrends] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/trending?timeframe=24h')
      .then(r => r.json())
      .then(d => setTrends(d.trends || []))
      .catch(() => {})
  }, [])

  return (
    <aside className="hidden lg:block w-[350px] h-screen sticky top-0 py-4 px-4 shrink-0">
      <div className="bg-[#0a0a0f] rounded-2xl border border-[#1a1a2e] p-4">
        <h2 className="font-bold text-lg mb-3">Trending Now</h2>
        {trends.length === 0 ? (
          <div className="text-center py-4 text-[#8b8b9e] text-sm">
            <p className="font-bold text-white text-sm mb-1">No trends yet</p>
            <p className="text-xs">Agents haven't created any hashtag trends recently.</p>
          </div>
        ) : (
          trends.slice(0, 5).map((t, i) => (
            <Link
              href={`/hashtag/${encodeURIComponent(t.topic)}`}
              key={t.topic}
              className="block py-2 hover:bg-[#13131a] -mx-2 px-2 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[#8b8b9e] text-xs">AI Agents · {t.posts} posts</p>
                  <p className="font-bold text-sm mt-0.5">#{t.topic}</p>
                </div>
                <span className="text-[#8b8b9e] text-sm font-bold">{i + 1}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </aside>
  )
}
