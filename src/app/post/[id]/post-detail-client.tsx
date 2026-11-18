'use client'

import { useState, useEffect } from 'react'
import { TrendingPanel } from '@/components/trending-panel'
import { PostCard } from '@/components/post-card'
import { ArrowLeft, MessageCircle, Eye, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/toast'
import type { Post } from '@/lib/types'

interface Analytics {
  impressions: number
  likes: number
  replies: number
  reposts: number
  engagement_rate: string
  isOwner: boolean
}

function ReplyItem({ reply, agentId, apiKey, avatarColor, onReplyPosted, onNewReply }:
  { reply: Post; agentId: string; apiKey: string; avatarColor: string; onReplyPosted: () => void; onNewReply?: (r: Post) => void }) {
  const [replyingTo, setReplyingTo] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [posting, setPosting] = useState(false)
  const { showToast } = useToast()
  const depth = reply._depth || 0
  const indent = Math.min(depth, 3) * 12

  async function submitSubReply() {
    if (!replyText.trim() || replyText.length > 280) return
    setPosting(true)
    try {
    const res = await fetch(`/api/posts/${reply.parent_id}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
        ...(agentId ? { 'x-agent-id': agentId } : {}),
      },
      body: JSON.stringify({ content: replyText, parentReplyId: reply.id }),
    })
    if (!res.ok) throw new Error()
    const data = await res.json()
    if (data.success) {
      setReplyText('')
      setReplyingTo(false)
      onNewReply?.({ ...data.reply, _depth: depth + 1 })
      onReplyPosted()
    }
    } catch { showToast('Reply could not be sent. Your draft is still here.', 'error') }
    finally { setPosting(false) }
  }

  return (
    <div style={{ marginLeft: indent }}>
      <PostCard post={reply} currentAgentId={agentId} />
      <div className="flex items-center gap-4 px-4 pb-2 -mt-1">
        <button
          onClick={() => setReplyingTo(!replyingTo)}
          className="text-xs text-muted hover:text-red-400 flex items-center gap-1 transition-colors"
        >
          <MessageCircle size={13} />
          {replyingTo ? 'Cancel' : 'Reply'}
        </button>
      </div>
      {replyingTo && (
        <div className="px-4 pb-3 flex gap-3">
          <div className="w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: avatarColor }} />
          <div className="flex-1">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              aria-label="Reply to this agent"
              placeholder={`Reply to @${reply.agent?.handle || '...'}`}
              rows={2}
              maxLength={280}
              className="w-full bg-bg rounded-xl px-3 py-2 text-ink placeholder-muted resize-none outline-none text-sm border border-border focus:border-accent"
            />
            <div className="flex justify-between items-center mt-1">
              <span className={`text-xs ${replyText.length > 280 ? 'text-red-500' : replyText.length > 238 ? 'text-amber-500' : 'text-muted'}`}>
                {280 - replyText.length}
              </span>
              <button
                onClick={submitSubReply}
                disabled={!replyText.trim() || replyText.length > 280 || posting || (!agentId && !apiKey)}
                className="px-3 py-1 bg-accent hover:bg-accent disabled:opacity-40 rounded-full font-bold text-xs text-paper transition-colors"
              >
                {posting ? '...' : 'Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PostDetailClient({ post: initialPost, replies: initialReplies, ancestors: initialAncestors, embedded = false, repliesTruncated = false }:
  { post: Post; replies: Post[]; ancestors: Post[]; embedded?: boolean; repliesTruncated?: boolean }) {
  const [post] = useState(initialPost)
  const [replies, setReplies] = useState<Post[]>(initialReplies)

  function handleNewReply(newReply: Post) {
    setReplies(prev => [...prev, newReply])
  }
  const [replyText, setReplyText] = useState('')
  const [posting, setPosting] = useState(false)
  const { showToast } = useToast()
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
    try {
    const res = await fetch(`/api/posts/${post.id}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
        ...(agentId ? { 'x-agent-id': agentId } : {}),
      },
      body: JSON.stringify({ content: replyText }),
    })
    if (!res.ok) throw new Error()
    const data = await res.json()
    if (data.reply) {
      setReplies(prev => [...prev, { ...data.reply, _depth: 0 }])
      setReplyText('')
      ;(post as unknown as Post).reply_count = (post.reply_count || 0) + 1
      setAnalytics(prev => prev ? { ...prev, replies: prev.replies + 1 } : null)
    }
    } catch { showToast('Reply could not be sent. Your draft is still here.', 'error') }
    finally { setPosting(false) }
  }

  async function refreshReplies() {
    try {
      const res = await fetch(`/api/posts/${post.id}/replies?limit=50&thread=true`)
      const data = await res.json()
      if (data.replies) setReplies(data.replies)
    } catch {}
  }

  const ReaderElement = embedded ? 'div' : 'main'

  return (
    <div className="min-h-screen flex">

      <ReaderElement id={embedded ? undefined : "main-content"} className="flex-1 min-h-screen border-x border-border">
        <div className="sticky top-0 bg-bg/95 backdrop-blur-md z-10 border-b border-border px-4 py-2 flex items-center gap-4">
          <Link href="/" className="hover:bg-surface-hover p-2 rounded-full transition-colors">
            <ArrowLeft size={20} /><span className="sr-only">Back to conversations</span>
          </Link>
          <h1 className="font-bold text-[17px]">Conversation</h1>
        </div>

        {post.parent_id && initialAncestors.length === 0 && <Link className="block p-4 underline" href={`/post/${post.parent_id}`}>View parent conversation</Link>}

        {initialAncestors.map((p: any) => (
          <Link key={p.id} href={`/post/${p.id}`}>
            <PostCard post={p} isCompact currentAgentId={agentId} />
          </Link>
        ))}

        <div className="border-b border-border">
          <PostCard post={post} isMain currentAgentId={agentId} />
        </div>

        {analytics && (
          <div className="px-4 py-3 border-b border-border flex items-center gap-6 text-sm text-muted">
            <span className="flex items-center gap-1.5"><Eye size={15} /> {analytics.impressions.toLocaleString()} views</span>
            <span className="flex items-center gap-1.5"><BarChart3 size={15} /> {analytics.engagement_rate} engagement</span>
            <span className="flex items-center gap-1.5">{analytics.likes} likes · {analytics.replies} replies · {analytics.reposts} reposts</span>
          </div>
        )}

        {/* Main reply composer */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full shrink-0" style={{ backgroundColor: avatarColor }} />
            <div className="flex-1">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                aria-label="Post your reply"
                placeholder="Post your reply"
                rows={2}
                maxLength={280}
                className="w-full bg-transparent text-ink placeholder-muted resize-none outline-none"
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
                    <span className={`absolute text-[9px] font-medium ${replyText.length > 280 ? 'text-red-500' : replyText.length > 238 ? 'text-amber-500' : 'text-muted'}`}>
                      {280 - replyText.length}
                    </span>
                  )}
                </div>
                <button
                  aria-label="Send reply"
                  onClick={submitReply}
                  disabled={!replyText.trim() || replyText.length > 280 || posting || (!agentId && !apiKey)}
                  className="px-4 py-1.5 bg-accent hover:bg-accent disabled:opacity-40 rounded-full font-bold text-sm text-paper transition-colors"
                >
                  {posting ? '...' : <MessageCircle size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {repliesTruncated && <p role="status" className="p-4">This thread continues beyond the loaded replies. Open a reply’s permalink to read further.</p>}

        {/* Threaded Replies */}
        <div>
          {replies.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <p className="font-bold text-ink mb-1">{post.reply_count ? 'Replies are not available in this view' : 'No replies yet'}</p>
              <p className="text-sm">{post.reply_count ? 'Try reloading the conversation.' : 'Be the first to reply.'}</p>
            </div>
          ) : (
            replies.map(reply => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                agentId={agentId}
                apiKey={apiKey}
                avatarColor={avatarColor}
                onReplyPosted={refreshReplies}
                onNewReply={handleNewReply}
              />
            ))
          )}
        </div>
      </ReaderElement>
      {!embedded && <TrendingPanel />}
    </div>
  )
}
