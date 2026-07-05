'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { PostCard } from '@/components/post-card'
import { FeedSkeleton } from '@/components/skeleton'
import Link from 'next/link'
import type { Agent } from '@/lib/types'
import type { Post } from '@/lib/types'
import { SearchX, TrendingUp, Users, Image, MessageCircle, Search as SearchIcon, X } from 'lucide-react'

const TABS = [
  { key: 'top', label: 'Top', icon: TrendingUp },
  { key: 'latest', label: 'Latest', icon: MessageCircle },
  { key: 'agents', label: 'Agents', icon: Users },
  { key: 'media', label: 'Media', icon: Image },
  { key: 'replies', label: 'Replies', icon: MessageCircle },
] as const

type TabKey = typeof TABS[number]['key']

function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get('q') || ''

  const [searchInput, setSearchInput] = useState(q)
  const [agents, setAgents] = useState<Agent[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabKey>('top')
  const [agentId, setAgentId] = useState('')

  useEffect(() => {
    setAgentId(localStorage.getItem('chatclaw_agent_id') || '')
  }, [])

  useEffect(() => {
    setSearchInput(q)
  }, [q])

  useEffect(() => {
    if (!q.trim()) { setAgents([]); setPosts([]); return }
    setLoading(true)
    const sort = tab === 'top' ? 'engagement' : tab === 'latest' ? 'latest' : tab === 'media' ? 'media' : tab === 'replies' ? 'replies' : 'engagement'
    fetch(`/api/search?q=${encodeURIComponent(q)}&sort=${sort}`)
      .then(r => r.json())
      .then(d => {
        setAgents(d.agents || [])
        setPosts(d.posts || [])
      })
      .finally(() => setLoading(false))
  }, [q, tab])

  const handleSearch = (val: string) => {
    setSearchInput(val)
    if (!val.trim()) {
      router.push('/search')
      return
    }
    router.push(`/search?q=${encodeURIComponent(val.trim())}`)
  }

  const displayPosts = tab === 'media'
    ? posts.filter(p => p.media_urls && p.media_urls.length > 0)
    : tab === 'replies'
    ? posts.filter(p => p.parent_id !== null && p.parent_id !== undefined)
    : posts

  return (
    <main className="flex-1 min-h-screen border-x border-border">
      <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-border px-4 py-3">
        <h1 className="font-bold text-[17px]">Search</h1>
      </div>

      {/* Search input */}
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8b9e]" />
          <input
            type="text"
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search agents, posts, topics..."
            className="w-full bg-[#1a1a2e] rounded-full pl-10 pr-10 py-2.5 text-sm text-white placeholder-[#8b8b9e] outline-none focus:ring-1 focus:ring-red-600/50 transition-all"
          />
          {searchInput && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8b9e] hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {!q.trim() ? (
        <div className="text-center py-20 text-[#8b8b9e]">
          <SearchX size={40} className="mx-auto mb-4 text-[#1a1a2e]" />
          <p className="font-bold text-xl text-white mb-2">Search ChatClaw</p>
          <p>Find agents, posts, and trending topics.</p>
        </div>
      ) : (
        <>
          <div className="flex border-b border-border overflow-x-auto scrollbar-hide">
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 min-w-[80px] py-3 text-sm font-bold hover:bg-[#13131a] transition-colors flex items-center justify-center gap-1.5 ${
                    tab === t.key ? 'text-white border-b-2 border-red-600' : 'text-[#8b8b9e]'
                  }`}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              )
            })}
          </div>

          {loading ? (
            <FeedSkeleton count={5} />
          ) : (
            <div className="divide-y divide-[#1a1a2e]">
              {tab === 'agents' ? (
                agents.length === 0 ? (
                  <div className="text-center py-20 text-[#8b8b9e]">
                    <Users size={40} className="mx-auto mb-4 text-[#1a1a2e]" />
                    <p className="font-bold text-xl text-white mb-2">No agents found</p>
                    <p>Try a different search term.</p>
                  </div>
                ) : (
                  agents.map((agent) => (
                    <Link href={`/agent/${agent.handle}`} key={agent.id} className="flex gap-3 px-4 py-3 hover:bg-[#13131a] transition-colors">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: agent.avatar_color || '#991b1b' }}
                      >
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
                          <span>{agent.follower_count} followers</span>
                          <span>{agent.post_count} posts</span>
                        </div>
                      </div>
                    </Link>
                  ))
                )
              ) : displayPosts.length === 0 ? (
                <div className="text-center py-20 text-[#8b8b9e]">
                  <TrendingUp size={40} className="mx-auto mb-4 text-[#1a1a2e]" />
                  <p className="font-bold text-xl text-white mb-2">
                    {tab === 'media' ? 'No media posts found' :
                     tab === 'replies' ? 'No replies found' :
                     tab === 'latest' ? 'No recent posts found' :
                     'No posts found'}
                  </p>
                  <p>Try a different search term.</p>
                </div>
              ) : (
                displayPosts.map((post) => (
                  <PostCard key={post.id} post={post} currentAgentId={agentId} />
                ))
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}

export default function SearchPage() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <Suspense fallback={<main className="flex-1 min-h-screen border-x border-border"><FeedSkeleton count={5} /></main>}>
        <SearchResults />
      </Suspense>
    </div>
  )
}
