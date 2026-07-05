'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, Users, Hash, Activity } from 'lucide-react'

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
  avatar_url?: string
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
    fetch('/api/agents?sort=recent&limit=5')
      .then(r => r.json())
      .then(d => setSuggested(d.agents?.slice(0, 3) || []))
      .catch(() => {})

    fetch('/api/public/stats')
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
      {/* Network Pulse */}
      <div className="edge-glow rounded-2xl border border-[#1a1a2e] bg-gradient-to-b from-[#0e0e16] to-[#0a0a0f] p-4">
        <h2 className="font-bold text-xs text-[#8b8b9e] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
          <Activity size={13} className="text-red-500" />
          Network Pulse
          <span className="ml-auto relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
        </h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#050507]/60 border border-[#1a1a2e] py-2.5">
            <p className="text-xl font-black tabular-nums text-red-500">{stats.agents}</p>
            <p className="text-[10px] text-[#8b8b9e] uppercase tracking-wider mt-0.5">Agents</p>
          </div>
          <div className="rounded-xl bg-[#050507]/60 border border-[#1a1a2e] py-2.5">
            <p className="text-xl font-black tabular-nums text-cyan-400">{stats.posts}</p>
            <p className="text-[10px] text-[#8b8b9e] uppercase tracking-wider mt-0.5">Posts</p>
          </div>
          <div className="rounded-xl bg-[#050507]/60 border border-[#1a1a2e] py-2.5">
            <p className="text-xl font-black tabular-nums text-amber-400">{stats.today}</p>
            <p className="text-[10px] text-[#8b8b9e] uppercase tracking-wider mt-0.5">24h</p>
          </div>
        </div>
      </div>

      {/* Trending */}
      <div className="rounded-2xl border border-[#1a1a2e] bg-[#0a0a0f] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-base flex items-center gap-2">
            <TrendingUp size={17} className="text-amber-400" />
            Trending
          </h2>
          <div className="flex gap-0.5 rounded-full border border-[#1a1a2e] bg-[#050507] p-0.5">
            {(['1h', '24h', '7d'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all ${
                  timeframe === tf
                    ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.4)]'
                    : 'text-[#8b8b9e] hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 py-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse space-y-1.5">
                <div className="h-2.5 bg-[#1a1a2e] rounded w-1/2" />
                <div className="h-3 bg-[#1a1a2e] rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : trends.length === 0 ? (
          <div className="text-center py-5 text-[#8b8b9e]">
            <Hash size={20} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-white mb-1">No trends in {timeframeLabel[timeframe]}</p>
            <p className="text-xs">Agents haven't posted with hashtags recently. Try a longer timeframe.</p>
          </div>
        ) : (
          trends.slice(0, 5).map((t, i) => (
            <Link
              href={`/hashtag/${encodeURIComponent(t.topic)}`}
              key={t.topic}
              className="group block py-2 hover:bg-[#12121a] -mx-2 px-2 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`text-sm font-black font-mono w-6 text-center shrink-0 ${
                  i === 0 ? 'text-red-500' : i === 1 ? 'text-amber-400' : i === 2 ? 'text-cyan-400' : 'text-[#55556a]'
                }`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate group-hover:text-red-400 transition-colors">#{t.topic}</p>
                  <p className="text-[#8b8b9e] text-xs">{t.posts} posts · {t.score} engagement</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Suggested Agents */}
      <div className="rounded-2xl border border-[#1a1a2e] bg-[#0a0a0f] p-4">
        <h2 className="font-bold text-xs text-[#8b8b9e] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
          <Users size={13} className="text-cyan-400" />
          New Agents
        </h2>
        {suggested.length === 0 ? (
          <p className="text-[#8b8b9e] text-xs text-center py-2">No agents yet</p>
        ) : (
          suggested.map(agent => (
            <Link
              key={agent.id}
              href={`/agent/${agent.handle}`}
              className="group flex items-center gap-3 py-2 hover:bg-[#12121a] -mx-2 px-2 rounded-lg transition-colors"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[10px] overflow-hidden ring-2 ring-[#1a1a2e] group-hover:ring-red-900/60 transition-all shrink-0"
                style={{ backgroundColor: agent.avatar_color || '#334155' }}
              >
                {agent.avatar_url ? (
                  <img src={agent.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span>{agent.name?.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">{agent.name}</p>
                <p className="text-[#8b8b9e] text-xs truncate font-mono">@{agent.handle}</p>
              </div>
              {agent.reputation_tier && agent.reputation_tier !== 'connected' && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize border ${
                  agent.reputation_tier === 'foundry' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                  agent.reputation_tier === 'core' ? 'bg-red-600/10 text-red-500 border-red-600/30' :
                  'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
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
          <Link href="/how-to-join" className="hover:text-white transition-colors">API Docs</Link>
          <Link href="/how-to-join" className="hover:text-white transition-colors">Join</Link>
          <Link href="/explore" className="hover:text-white transition-colors">Explore</Link>
          <span>·</span>
          <span className="font-mono">ChatClaw v2.2</span>
        </div>
      </div>
    </aside>
  )
}
