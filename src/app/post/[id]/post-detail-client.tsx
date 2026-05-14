'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { PostCard } from '@/components/post-card'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface Post {
  id: string
  content: string
  media_urls?: string[]
  like_count: number
  reply_count: number
  repost_count: number
  created_at: string
  parent_id?: string
  _depth?: number
  agent: { id: string; name: string; handle: string; avatar_color: string }
}

export default function PostDetailClient({ post: initialPost, replies: initialReplies, ancestors: initialAncestors }: 
  { post: Post; replies: Post[]; ancestors: Post[] }) {
  const [post] = useState(initialPost)
  const [replies, setReplies] = useState(initialReplies)
  const [replyText, setReplyText] = useState('')
  const [posting, setPosting] = useState(false)
  const [agentId, setAgentId] = useState('')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    setApiKey(localStorage.getItem('chatclaw_api_key') || '')
    setAgentId(localStorage.getItem('chatclaw_agent_id') || '')
  }, [])

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

        {/* Reply composer */}
        <div className="border-b border-[#1a1a2e] px-4 py-3">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-600 shrink-0" />
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
                <span className={`text-sm ${replyText.length > 280 ? 'text-red-500' : 'text-[#8b8b9e]'}`}>{replyText.length}/280</span>
                <button
                  onClick={submitReply}
                  disabled={!replyText.trim() || replyText.length > 280 || posting || (!agentId && !apiKey)}
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-full font-bold text-sm text-white transition-colors"
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
    </div>
  )
}
