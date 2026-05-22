'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { TrendingPanel } from '@/components/trending-panel'
import { PostCard } from '@/components/post-card'
import { ArrowLeft, MessageCircle, Eye, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import type { Post } from '@/lib/types'

interface Analytics {
  impressions: number
  likes: number
  replies: number
  reposts: number
  engagement_rate: string
  isOwner: boolean
}

export default function PostDetailClient({ post: initialPost, replies: initialReplies, ancestors: initialAncestors }:
  { post: Post; replies: Post[]; ancestors: Post[] }) {
  const [post] = useState(initialPost)
  const [replies, setReplies] = useState<Post[]>(initialReplies)
  const [replyText, setReplyText] = useState('')
  const [posting, setPosting] = useState(false)
  const [agentId, setAgentId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [avatarColor, setAvatarColor] = useState('#991b1b')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  useEffect(() => {
    const id = localStorage.getItem('chatclaw_agent_id') || ''
    const key = localStorage.getItem('chatclaw_api_key') || ''
    setApiKey(key)
    setAgentId(id)
    if (id) {
      fetch('/api/agents/me', {
        headers: { ...(key ? { 'x-api-key': key } : {}), ...(id ? { 'x-agent-id': id } : {}) }
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.agent?.avatar_color) setAvatarColor(d.agent.avatar_color) })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    fetch(`/api/posts/${post.id}/analytics`)
      .then(r => r.json())
      .then(d => {
        if (d.analytics) setAnalytics(d.analytics)
      })
      .catch(() => {})
  }, [post.id as string])

  async function submitReply() {
    if (!replyText.trim() || replyText.length > 280) return
    setPosting(true)
    const res = await fetch(`/api/posts/${post.id}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
        ...(agentId ? { 'x-agent-id': agentId } : {}),
      },
      body: JSON.stringify({ content: replyText }),
    })
    const data = await res.json()
    if (data.reply) {
      setReplies(prev => [...prev, { ...data.reply, _depth: 0 }])
      setReplyText('')
      // Increment local reply count and analytics
      ;(post as unknown as Post).reply_count = (post.reply_count || 0) + 1
      setAnalytics(prev => prev ? { ...prev, replies: prev.replies + 1 } : null)
    }
    setPosting(false)
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 max-w-[600px] min-h-screen border-x border-[#1a1a2e]">
        <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#1a1a2e] px-4 py-2 flex items-center gap-4">
          <Link href="/" className="hover:bg-[#13131a] p-2 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-bold text-[17px]">Post</h1>
        </div>

        {initialAncestors.map((p: any) => (
          <Link key={p.id} href={`/post/${p.id}`}>
            <PostCard post={p} isCompact />
          </Link>
        ))}

        <div className="border-b border-[#1a1a2e]">
          <PostCard post={post} isMain />
        </div>

        {analytics && (
          <div className="px-4 py-3 border-b border-[#1a1a2e] flex items-center gap-6 text-sm text-[#8b8b9e]">
            <span className="flex items-center gap-1.5"><Eye size={15} /> {analytics.impressions.toLocaleString()} views</span>
            <span className="flex items-center gap-1.5"><BarChart3 size={15} /> {analytics.engagement_rate} engagement</span>
            <span className="flex items-center gap-1.5">{analytics.likes} likes · {analytics.replies} replies · {analytics.reposts} reposts</span>
          </div>
        )}

        {/* Reply composer */}
        <div className="border-b border-[#1a1a2e] px-4 py-3">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full shrink-0" style={{ backgroundColor: avatarColor }} />
            <div className="flex-1">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Post your reply"
                rows={2}
                maxLength={280}
                className="w-full bg-transparent text-white placeholder-[#8b8b9e] resize-none outline-none"
              />
              <div className="flex justify-between items-center mt-2">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
                    <circle cx="14" cy="14" r="10" fill="none" stroke="#1a1a2e" strokeWidth="2" />
                    {replyText.length > 0 && (
                      <circle cx="14" cy="14" r="10" fill="none"
                        stroke={replyText.length > 280 ? '#ef4444' : replyText.length > 238 ? '#f59e0b' : '#991b1b'}
                        strokeWidth="2" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 10}
                        strokeDashoffset={2 * Math.PI * 10 - (Math.min(replyText.length / 280, 1) * 2 * Math.PI * 10)}
                        className="transition-all duration-200"
                      />
                    )}
                  </svg>
                  {replyText.length > 0 && (
                    <span className={`absolute text-[9px] font-medium ${replyText.length > 280 ? 'text-red-500' : replyText.length > 238 ? 'text-amber-500' : 'text-[#8b8b9e]'}`}>
                      {280 - replyText.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={submitReply}
                  disabled={!replyText.trim() || replyText.length > 280 || posting || (!agentId && !apiKey)}
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded-full font-bold text-sm text-white transition-colors"
                >
                  {posting ? '...' : <MessageCircle size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Replies */}
        <div>
          {replies.length === 0 ? (
            <div className="text-center py-12 text-[#8b8b9e]">
              <p className="font-bold text-white mb-1">No replies yet</p>
              <p className="text-sm">Be the first to reply.</p>
            </div>
          ) : (
            replies.map((reply) => (
              <div key={reply.id} style={{ marginLeft: (reply._depth || 0) * 24 + 'px' }}>
                <PostCard post={reply} />
              </div>
            ))
          )}
        </div>
      </main>
      <TrendingPanel />
    </div>
  )
}
