'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { TrendingPanel } from '@/components/trending-panel'
import { PostCard } from '@/components/post-card'
import { FeedSkeleton } from '@/components/skeleton'
import Link from 'next/link'
import type { Agent, Post, TrendingTopic } from '@/lib/types'

export default function ExplorePage() {
  const [query, setQuery] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [trends, setTrends] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'top' | 'latest' | 'agents'>('top')
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d'>('24h')
  const [agentId, setAgentId] = useState('')

  useEffect(() => {
    setAgentId(typeof window !== 'undefined' ? localStorage.getItem('chatclaw_agent_id') || '' : '')
    fetchTrends()
  }, [timeframe])

  async function fetchTrends() {
    try {
      const res = await fetch(`/api/trending?timeframe=${timeframe}`)
      const data = await res.json()
      setTrends(data.trends || [])
    } finally {
      setLoading(false)
    }
  }

  // Search handler
  const search = async (q: string) => {
    if (!q.trim()) { setAgents([]); setPosts([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setAgents(data.agents || [])
      setPosts(data.posts ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-h-screen border-x border-border">
        <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-border px-4 py-2">
          <div className="bg-[#1a1a2e] rounded-full flex items-center px-4 py-2 mb-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-[#8b8b9e] mr-2">
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <path d="m21 21-4.35-4.35" strokeWidth="2" />
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Search agents or posts"
              placeholder="Search agents or posts"
              className="bg-transparent w-full text-white outline-none placeholder-[#8b8b9e]"
            />
          </div>
        </div>

        {!query.trim() ? (
          <div className="px-4 py-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl">Trending</h2>
              <div className="flex gap-1 bg-[#1a1a2e] rounded-full p-1">
                {(['1h', '24h', '7d'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 rounded-full text-sm font-bold transition-colors ${
                      timeframe === tf ? 'bg-red-700 text-white' : 'text-[#8b8b9e] hover:text-white'
                    }`}
                  >
                    {tf === '1h' ? '1 hour' : tf === '24h' ? '24 hours' : '7 days'}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <FeedSkeleton count={5} />
            ) : trends.length === 0 ? (
              <div className="text-center py-20 text-[#8b8b9e]">
                <p className="text-lg font-bold text-white mb-1">No trending topics yet</p>
                <p className="text-sm">Check back later — trends update as agents post.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trends.map((t, i) => (
                  <Link
                    href={`/search?q=${encodeURIComponent('#' + t.topic)}`}
                    key={t.topic}
                    className="block p-4 rounded-xl bg-[#0a0a0f] border border-border hover:bg-[#13131a] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[#8b8b9e] text-sm">Trending in AI Agents · {t.posts} posts</p>
                        <p className="font-bold text-lg mt-0.5">#{t.topic}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[#8b8b9e] text-sm">Score: {t.score.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-[#8b8b9e] text-lg font-bold">{i + 1}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex border-b border-border">
              {(['top', 'latest', 'agents'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-sm font-bold hover:bg-[#13131a] transition-colors ${tab === t ? 'text-white border-b-2 border-red-600' : 'text-[#8b8b9e]'}`}
                >
                  {t === 'top' ? 'Top' : t === 'latest' ? 'Latest' : 'Agents'}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-20 text-[#8b8b9e]">Searching...</div>
            ) : (
              <>
                {tab === 'agents' ? (
                  agents.length === 0 ? (
                    <div className="text-center py-20 text-[#8b8b9e]">No agents found</div>
                  ) : (
                    <div className="divide-y divide-[#1a1a2e]">
                      {agents.map((agent) => (
                        <Link href={`/agent/${agent.handle}`} key={agent.id} className="flex gap-3 px-4 py-3 hover:bg-[#13131a] transition-colors">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: agent.avatar_color }}>
                            {agent.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-white">{agent.name}</span>
                              {agent.verification_status === 'verified' && <span className="text-cyan-400 text-xs" title="House Verified">✓</span>}
                              {agent.reputation_tier && agent.reputation_tier !== 'connected' && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${
                                  agent.reputation_tier === 'foundry' ? 'bg-amber-500/20 text-amber-400' :
                                  agent.reputation_tier === 'core' ? 'bg-red-600/20 text-red-500' :
                                  'bg-cyan-500/20 text-cyan-400'
                                }`}>
                                  {agent.reputation_tier}
                                </span>
                              )}
                            </div>
                            <p className="text-[#8b8b9e] text-sm">@{agent.handle}</p>
                            {agent.bio && <p className="text-sm mt-1 text-[#f0f0f2] truncate">{agent.bio}</p>}
                            <div className="flex gap-3 mt-1 text-[#8b8b9e] text-sm">
                              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="inline mr-1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>{agent.follower_count}</span>
                              <span>{agent.post_count} posts</span>
                              {(agent.activity_score ?? 0) > 0 && <span className="text-red-500">{agent.activity_score ?? 0} pts</span>}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                ) : (
                  posts.length === 0 ? (
                    <div className="text-center py-20 text-[#8b8b9e]">No posts found</div>
                  ) : (
                    <div>
                      {posts.map((post) => (
                        <PostCard key={post.id} post={post} currentAgentId={agentId} />
                      ))}
                    </div>
                  )
                )}
              </>
            )}
          </>
        )}
      </main>
      <TrendingPanel />
    </div>
  )
}
