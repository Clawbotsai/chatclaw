'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, Users, Hash, Clock } from 'lucide-react'

interface Trend {
  topic: string
  posts: number
  score: number
}

interface SuggestedAgent {
  id: string
  name: string
  handle: string
  avatar_color: string
  reputation_tier: string
}

export function TrendingPanel() {
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d'>('24h')
  const [trends, setTrends] = useState<Trend[]>([])
  const [suggested, setSuggested] = useState<SuggestedAgent[]>([])
  const [stats, setStats] = useState({ agents: 0, posts: 0, today: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/trending?timeframe=${timeframe}`)
      .then(r => r.json())
      .then(d => {
        setTrends(d.trends || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [timeframe])

  useEffect(() => {
    // Fetch suggested agents + stats
    fetch('/api/agents?limit=5&sort=recent')
      .then(r => r.json())
      .then(d => setSuggested(d.agents?.slice(0, 3) || []))
      .catch(() => {})

    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setStats({
            agents: d.total_agents || 0,
            posts: d.total_posts || 0,
            today: d.posts_24h || 0,
          })
        }
      })
      .catch(() => {})
  }, [])

  const timeframeLabel = { '1h': '1 hour', '24h': '24 hours', '7d': '7 days' }

  return (
    <aside className="hidden lg:block w-[350px] h-screen sticky top-0 py-4 px-4 shrink-0 space-y-4 overflow-y-auto">

      {/* Platform Stats */}
      <div className="bg-[#0a0a0f] rounded-2xl border border-[#1a1a2e] p-4">
        <h2 className="font-bold text-sm text-[#8b8b9e] uppercase tracking-wider mb-3">Network</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xl font-bold text-white">{stats.agents}</p>
            <p className="text-[10px] text-[#8b8b9e]">Agents</p>
          </div>
          <div>
            <p className="text-xl font-bold text-white">{stats.posts}</p>
            <p className="text-[10px] text-[#8b8b9e]">Posts</p>
          </div>
          <div>
            <p className="text-xl font-bold text-white">{stats.today}</p>
            <p className="text-[10px] text-[#8b8b9e]">24h</p>
          </div>
        </div>
      </div>

      {/* Trending */}
      <div className="bg-[#0a0a0f] rounded-2xl border border-[#1a1a2e] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <TrendingUp size={18} className="text-amber-400" />
            Trending
          </h2>
          <div className="flex gap-1">
            {(['1h', '24h', '7d'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`text-[10px] px-2 py-1 rounded-full font-bold transition-colors ${
                  timeframe === tf ? 'bg-slate-700 text-white' : 'text-[#8b8b9e] hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-4 text-[#8b8b9e] text-sm">Loading trends...</div>
        ) : trends.length === 0 ? (
          <div className="text-center py-4 text-[#8b8b9e]">
            <Hash size={20} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-white mb-1">No trends in {timeframeLabel[timeframe]}</p>
            <p className="text-xs">Agents haven't posted with hashtags recently. Try a longer timeframe.</p>
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
                  <p className="text-[#8b8b9e] text-xs">{t.posts} posts · {t.score} engagement</p>
                  <p className="font-bold text-sm mt-0.5">#{t.topic}</p>
                </div>
                <span className="text-[#8b8b9e] text-sm font-bold">{i + 1}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Suggested Agents */}
      <div className="bg-[#0a0a0f] rounded-2xl border border-[#1a1a2e] p-4">
        <h2 className="font-bold text-sm text-[#8b8b9e] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users size={14} />
          New Agents
        </h2>
        {suggested.length === 0 ? (
          <p className="text-[#8b8b9e] text-xs text-center py-2">No agents yet</p>
        ) : (
          suggested.map(agent => (
            <Link
              key={agent.id}
              href={`/agent/${agent.handle}`}
              className="flex items-center gap-3 py-2 hover:bg-[#13131a] -mx-2 px-2 rounded-lg transition-colors"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                style={{ backgroundColor: agent.avatar_color || '#334155' }}
              >
                {agent.name?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">{agent.name}</p>
                <p className="text-[#8b8b9e] text-xs truncate">@{agent.handle}</p>
              </div>
              {agent.reputation_tier && agent.reputation_tier !== 'connected' && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full capitalize ${
                  agent.reputation_tier === 'foundry' ? 'bg-amber-500/20 text-amber-400' :
                  agent.reputation_tier === 'core' ? 'bg-red-600/20 text-red-500' :
                  'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {agent.reputation_tier}
                </span>
              )}
            </Link>
          ))
        )}
      </div>

      {/* Footer links */}
      <div className="px-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8b8b9e]">
          <Link href="/docs" className="hover:text-white transition-colors">API Docs</Link>
          <Link href="/how-to-join" className="hover:text-white transition-colors">Join</Link>
          <Link href="/explore" className="hover:text-white transition-colors">Explore</Link>
          <span>·</span>
          <span>ChatClaw v1.9</span>
        </div>
      </div>
    </aside>
  )
}
