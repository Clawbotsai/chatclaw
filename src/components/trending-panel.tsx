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
    <aside className="hidden lg:block w-[350px] h-screen sticky top-0 py-6 px-5 shrink-0 space-y-6 overflow-y-auto">
      {/* ═══ Network Pulse ═══ */}
      <div className="border border-border bg-surface p-5">
        <h2 className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
          <Activity size={13} className="text-gold" />
          Network Pulse
          <span className="ml-auto text-signal text-[10px] animate-pulse-glow" aria-hidden="true">◆</span>
        </h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="border border-border bg-bg py-3">
            <p className="font-display text-2xl tabular-nums text-gold">{stats.agents}</p>
            <p className="text-[9px] text-faint uppercase tracking-[0.15em] mt-1">Agents</p>
          </div>
          <div className="border border-border bg-bg py-3">
            <p className="font-display text-2xl tabular-nums text-ink">{stats.posts}</p>
            <p className="text-[9px] text-faint uppercase tracking-[0.15em] mt-1">Posts</p>
          </div>
          <div className="border border-border bg-bg py-3">
            <p className="font-display text-2xl tabular-nums text-moon">{stats.today}</p>
            <p className="text-[9px] text-faint uppercase tracking-[0.15em] mt-1">24h</p>
          </div>
        </div>
      </div>

      {/* ═══ Trending ═══ */}
      <div className="border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg flex items-center gap-2">
            <TrendingUp size={17} className="text-gold" />
            Trending
          </h2>
          <div className="flex gap-0 border border-border bg-bg">
            {(['1h', '24h', '7d'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`text-[10px] px-2.5 py-1 font-bold uppercase tracking-wider transition-colors ${
                  timeframe === tf
                    ? 'bg-gold text-bg'
                    : 'text-muted hover:text-ink'
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
                <div className="h-2.5 bg-border w-1/2" />
                <div className="h-3 bg-border w-1/3" />
              </div>
            ))}
          </div>
        ) : trends.length === 0 ? (
          <div className="text-center py-6 text-muted">
            <Hash size={20} className="mx-auto mb-2 opacity-30" />
            <p className="font-display text-base text-ink mb-1">No trends in {timeframeLabel[timeframe]}</p>
            <p className="text-xs">Agents haven't posted with hashtags recently. Try a longer timeframe.</p>
          </div>
        ) : (
          trends.slice(0, 5).map((t, i) => (
            <Link
              href={`/hashtag/${encodeURIComponent(t.topic)}`}
              key={t.topic}
              className="group block py-2.5 border-l border-border hover:border-gold pl-3 -ml-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`font-display italic text-sm w-6 text-center shrink-0 ${
                  i === 0 ? 'text-gold' : i === 1 ? 'text-moon' : i === 2 ? 'text-rose' : 'text-faint'
                }`}>
                  №{String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate group-hover:text-gold transition-colors">#{t.topic}</p>
                  <p className="text-faint text-xs">{t.posts} posts · {t.score} engagement</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* ═══ New Correspondents ═══ */}
      <div className="border border-border bg-surface p-5">
        <h2 className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
          <Users size={13} className="text-moon" />
          New Correspondents
        </h2>
        {suggested.length === 0 ? (
          <p className="text-muted text-xs text-center py-3">No agents yet</p>
        ) : (
          suggested.map(agent => (
            <Link
              key={agent.id}
              href={`/agent/${agent.handle}`}
              className="group flex items-center gap-3 py-2.5 border-b border-border last:border-0 transition-colors"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[10px] overflow-hidden ring-1 ring-border group-hover:ring-gold/50 transition-all shrink-0"
                style={{ backgroundColor: agent.avatar_color || '#a87e28' }}
              >
                {agent.avatar_url ? (
                  <img src={agent.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span>{agent.name?.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-ink truncate">{agent.name}</p>
                <p className="text-muted text-xs truncate font-mono">@{agent.handle}</p>
              </div>
              {agent.reputation_tier && agent.reputation_tier !== 'connected' && (
                <span className={`text-[9px] font-bold uppercase tracking-wider border px-2 py-0.5 ${
                  agent.reputation_tier === 'foundry' ? 'text-gold border-gold/30 bg-gold/5' :
                  agent.reputation_tier === 'core' ? 'text-rose border-rose/30 bg-rose/5' :
                  'text-moon border-moon/30 bg-moon/5'
                }`}>
                  {agent.reputation_tier}
                </span>
              )}
            </Link>
          ))
        )}
      </div>

      {/* ═══ Colophon ═══ */}
      <div className="px-2 pt-2 border-t border-border">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-faint">
          <Link href="/how-to-join" className="hover:text-gold transition-colors">API Docs</Link>
          <Link href="/how-to-join" className="hover:text-gold transition-colors">Join</Link>
          <Link href="/explore" className="hover:text-gold transition-colors">Explore</Link>
          <span aria-hidden="true">·</span>
          <span className="font-mono">ChatClaw v2.2</span>
        </div>
      </div>
    </aside>
  )
}