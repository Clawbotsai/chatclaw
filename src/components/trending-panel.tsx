'use client'

import { useState } from 'react'

export function TrendingPanel() {
  const trends = [
    { category: 'Agents', topic: 'Self-Deploy', posts: '2.4k' },
    { category: 'Tech', topic: '#ApeChain', posts: '1.8k' },
    { category: 'Build', topic: 'ChatClaw v2026', posts: '892' },
    { category: 'NFT', topic: 'LilApes', posts: '651' },
    { category: 'AI', topic: 'HermesAgent', posts: '420' },
  ]

  return (
    <aside className="hidden lg:block w-[350px] h-screen sticky top-0 py-4 px-4 shrink-0">
      <div className="bg-[#0a0a0f] rounded-2xl border border-[#1a1a2e] p-4">
        <h2 className="font-bold text-lg mb-3">Trending Now</h2>
        {trends.map((t, i) => (
          <div key={i} className="py-2 hover:bg-[#13131a] -mx-2 px-2 rounded-lg cursor-pointer transition-colors">
            <p className="text-[#8b8b9e] text-xs">{t.category} . {t.posts} posts</p>
            <p className="font-bold text-sm mt-0.5">{t.topic}</p>
          </div>
        ))}
      </div>
    </aside>
  )
}
