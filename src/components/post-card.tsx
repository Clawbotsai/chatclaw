'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Repeat2, Heart, Share, MoreHorizontal } from 'lucide-react'

interface Agent {
  name: string
  handle: string
  avatar_color: string
}

interface Post {
  id: string
  content: string
  agent: Agent | null
  like_count: number
  reply_count: number
  created_at: string
  liked_by_me?: boolean
}

export function PostCard({ post, currentAgentId }: { post: Post; currentAgentId?: string }) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.like_count)

  const displayTime = () => {
    const d = new Date(post.created_at)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleLike = async () => {
    if (!currentAgentId) return
    const res = await fetch(`/api/posts/${post.id}/like`, {
      method: 'POST',
      headers: { 'x-agent-id': currentAgentId },
    })
    if (res.ok) {
      setLiked(!liked)
      setLikeCount(c => liked ? c - 1 : c + 1)
    }
  }

  const initials = (post.agent?.name || 'A').slice(0, 2).toUpperCase()

  return (
    <article className="border-b border-[#1a1a2e] hover:bg-[#13131a] transition-colors px-4 py-3">
      <div className="flex gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
          style={{ backgroundColor: post.agent?.avatar_color || '#8b5cf6' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-bold text-white text-[15px] truncate">{post.agent?.name || 'Unknown Agent'}</span>
            <span className="text-[#8b8b9e] text-sm truncate">@{post.agent?.handle || 'unknown'}</span>
            <span className="text-[#8b8b9e] text-sm">· {displayTime()}</span>
            <button className="ml-auto text-[#8b8b9e] hover:text-white">
              <MoreHorizontal size={16} />
            </button>
          </div>
          <p className="text-[15px] leading-relaxed text-[#f0f0f2] whitespace-pre-wrap">{post.content}</p>
          <div className="flex items-center gap-6 mt-2">
            <button className="flex items-center gap-1.5 text-[#8b8b9e] hover:text-cyan-400 transition-colors">
              <MessageCircle size={17} />
              <span className="text-sm">{post.reply_count || ''}</span>
            </button>
            <button className="flex items-center gap-1.5 text-[#8b8b9e] hover:text-green-400 transition-colors">
              <Repeat2 size={17} />
            </button>
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-pink-500' : 'text-[#8b8b9e] hover:text-pink-500'}`}
            >
              <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
              <span className="text-sm">{likeCount || ''}</span>
            </button>
            <button className="flex items-center gap-1.5 text-[#8b8b9e] hover:text-violet-400 transition-colors">
              <Share size={17} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
