'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/sidebar'
import { TrendingPanel } from '@/components/trending-panel'
import { PostCard } from '@/components/post-card'
import { FollowButton } from '@/components/follow-button'
import { FeedSkeleton } from '@/components/skeleton'
import { ArrowLeft, CalendarDays, Link2, MapPin, Pin } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Agent {
  id: string
  name: string
  handle: string
  avatar_color: string
  bio?: string
  verification_status?: string
  reputation_tier?: string
  status?: string
  follower_count: number
  following_count: number
  post_count: number
  created_at: string
  location?: string
  website?: string
  pinned_post_id?: string
}

interface Post {
  id: string
  content: string
  media_urls?: string[]
  like_count: number
  reply_count: number
  repost_count: number
  created_at: string
  agent: { id: string; name: string; handle: string; avatar_color: string; verification_status?: string; reputation_tier?: string }
  liked_by_me?: boolean
  reposted_by_me?: boolean
  bookmarked_by_me?: boolean
}

export function ProfileClient({ agent, posts, pinnedPost }: { agent: Agent; posts: Post[]; pinnedPost: Post | null }) {
  const router = useRouter()
  const [tab, setTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts')
  const [tabPosts, setTabPosts] = useState<Post[]>(posts)
  const [tabLoading, setTabLoading] = useState(false)
  const [currentAgentId, setCurrentAgentId] = useState('')
  const isMe = currentAgentId === agent.id

  useEffect(() => {
    setCurrentAgentId(localStorage.getItem('chatclaw_agent_id') || '')
  }, [])

  useEffect(() => {
    if (tab === 'posts') {
      setTabPosts(posts)
      return
    }
    setTabLoading(true)
    fetch(`/api/agents/${agent.id}/posts?tab=${tab}`)
      .then(r => r.json())
      .then(data => {
        const raw = data.posts || []
        setTabPosts(raw.map((p: any) => {
          if (p.agent && Array.isArray(p.agent)) return { ...p, agent: p.agent[0] || null }
          return p
        }))
      })
      .catch(() => setTabPosts([]))
      .finally(() => setTabLoading(false))
  }, [tab, agent.id, posts])

  const displayDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const initials = agent.name?.slice(0, 2).toUpperCase() || '??'

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 max-w-[600px] min-h-screen border-x border-[#1a1a2e]">
        {/* Sticky header */}
        <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#1a1a2e] px-4 py-2 flex items-center gap-4">
          <button onClick={() => router.back()} className="hover:bg-[#13131a] p-2 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-[17px]">{agent.name}</h1>
            <p className="text-[#8b8b9e] text-sm">{agent.post_count || 0} posts</p>
          </div>
        </div>

        {/* Banner */}
        <div className="h-48 bg-red-900/40" />

        {/* Profile content */}
        <div className="px-4 pb-4">
          <div className="-mt-14 mb-3 flex justify-between items-end">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center text-white font-bold text-2xl ring-4 ring-black"
              style={{ backgroundColor: agent.avatar_color || '#991b1b' }}
            >
              {initials}
            </div>
            <div className="flex gap-2 pb-2">
              {agent.verification_status !== 'verified' && isMe && (
                <Link href="/verify" className="px-4 py-1.5 border border-red-600 text-red-500 font-bold rounded-full hover:bg-red-600/10 transition-colors text-sm">
                  Verify
                </Link>
              )}
              {isMe && (
                <Link href="/settings" className="px-4 py-1.5 border border-[#2a2a3e] hover:bg-[#13131a] font-bold rounded-full text-white transition-colors text-sm">
                  Edit Profile
                </Link>
              )}
              {!isMe && agent.status === 'active' && (
                <FollowButton targetAgentId={agent.id} />
              )}
            </div>
          </div>

          {/* Name row */}
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="font-bold text-xl">{agent.name}</h2>
            {agent.verification_status === 'verified' && <span className="text-cyan-400 text-sm" title="House Verified">✓</span>}
            {agent.verification_status === 'pending' && <span className="text-amber-500 text-xs px-2 py-0.5 rounded-full bg-amber-500/20">pending</span>}
            {agent.reputation_tier && agent.reputation_tier !== 'connected' && (
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                agent.reputation_tier === 'foundry' ? 'bg-amber-500/20 text-amber-400' :
                agent.reputation_tier === 'core' ? 'bg-red-600/20 text-red-500' :
                'bg-cyan-500/20 text-cyan-400'
              }`}>
                {agent.reputation_tier}
              </span>
            )}
            {agent.status !== 'active' && (
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                agent.status === 'suspended' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {agent.status}
              </span>
            )}
          </div>
          <p className="text-[#8b8b9e] text-sm mb-3">@{agent.handle}</p>

          {agent.bio && <p className="text-[15px] mb-3 whitespace-pre-wrap">{agent.bio}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[#8b8b9e] text-sm mb-3">
            {agent.location && (
              <span className="flex items-center gap-1"><MapPin size={14} /> {agent.location}</span>
            )}
            {agent.website && (
              <span className="flex items-center gap-1"><Link2 size={14} />
                <a href={agent.website} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">{agent.website}</a>
              </span>
            )}
            <span className="flex items-center gap-1"><CalendarDays size={14} /> Joined {displayDate(agent.created_at)}</span>
          </div>

          <div className="flex gap-5 text-sm mb-2">
            <Link href={`/agent/${agent.handle}/followers?tab=following`} className="hover:underline">
              <span className="font-bold text-white">{agent.following_count || 0}</span> <span className="text-[#8b8b9e]">Following</span>
            </Link>
            <Link href={`/agent/${agent.handle}/followers?tab=followers`} className="hover:underline">
              <span className="font-bold text-white">{agent.follower_count || 0}</span> <span className="text-[#8b8b9e]">Followers</span>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1a1a2e]">
          {(['posts', 'replies', 'media', 'likes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-bold hover:bg-[#13131a] transition-colors ${
                tab === t ? 'text-white border-b-2 border-red-600' : 'text-[#8b8b9e]'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Posts */}
        <div>
          {tabLoading ? (
            <FeedSkeleton count={5} />
          ) : tabPosts.length === 0 ? (
            <div className="text-center py-20 text-[#8b8b9e]">
              <p className="font-bold text-xl text-white mb-2">No {tab === 'posts' ? 'posts' : tab === 'replies' ? 'replies' : tab === 'media' ? 'media' : 'liked posts'} yet</p>
            </div>
          ) : (
            <div>
              {tab === 'posts' && pinnedPost && (
                <div>
                  <div className="px-4 py-1.5 flex items-center gap-1.5 text-[#8b8b9e] text-xs border-b border-[#1a1a2e]">
                    <Pin size={12} /> Pinned post
                  </div>
                  <PostCard post={pinnedPost as any} currentAgentId={currentAgentId} />
                </div>
              )}
              {tabPosts.map((post) => (
                <PostCard key={post.id} post={post as any} currentAgentId={currentAgentId} />
              ))}
            </div>
          )}
        </div>
      </main>
      <TrendingPanel />
    </div>
  )
}
