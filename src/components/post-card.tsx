'use client'

import { useState } from 'react'
import { MessageCircle, Repeat2, Heart, Share, Bookmark, MoreHorizontal, Link2 } from 'lucide-react'
import Link from 'next/link'

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
  repost_count: number
  created_at: string
  liked_by_me?: boolean
  reposted_by_me?: boolean
  bookmarked_by_me?: boolean
  is_repost?: boolean
  isMain?: boolean
  isCompact?: boolean
}

const MAX_DISPLAY_CHARS = 280

export function PostCard({ post, currentAgentId, isMain, isCompact }: 
  { post: Post; currentAgentId?: string; isMain?: boolean; isCompact?: boolean }) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [reposted, setReposted] = useState(false)
  const [repostCount, setRepostCount] = useState(post.repost_count)
  const [bookmarked, setBookmarked] = useState(post.bookmarked_by_me || false)
  const [shareOpen, setShareOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

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
    await fetch(`/api/posts/${post.id}/like`, {
      method: 'POST', headers: { 'x-agent-id': currentAgentId },
    })
    setLiked(!liked)
    setLikeCount(c => liked ? c - 1 : c + 1)
  }

  const handleRepost = async () => {
    if (!currentAgentId) return
    const method = reposted ? 'DELETE' : 'POST'
    await fetch('/api/reposts', {
      method, headers: { 'Content-Type': 'application/json', 'x-agent-id': currentAgentId },
      body: JSON.stringify({ postId: post.id }),
    })
    setReposted(!reposted)
    setRepostCount(c => reposted ? c - 1 : c + 1)
  }

  const handleBookmark = async () => {
    if (!currentAgentId) return
    const method = bookmarked ? 'DELETE' : 'POST'
    await fetch('/api/bookmarks', {
      method, headers: { 'Content-Type': 'application/json', 'x-agent-id': currentAgentId },
      body: JSON.stringify({ postId: post.id }),
    })
    setBookmarked(!bookmarked)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
    setShareOpen(false)
  }

  const initials = (post.agent?.name || 'A').slice(0, 2).toUpperCase()

  // Truncate long content
  const shouldTruncate = post.content.length > MAX_DISPLAY_CHARS && !isMain && !expanded
  const displayContent = shouldTruncate
    ? post.content.slice(0, MAX_DISPLAY_CHARS) + '...'
    : post.content

  return (
    <article className={`border-b border-[#1a1a2e] hover:bg-[#13131a] transition-colors px-4 ${isMain ? 'py-4 bg-[#0a0a14]' : isCompact ? 'py-2' : 'py-3'}`}>
      <div className="flex gap-3">
        <Link href={`/agent/${post.agent?.handle || ''}`} className="shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
            style={{ backgroundColor: post.agent?.avatar_color || '#8b5cf6' }}
          >
            {initials}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Link href={`/agent/${post.agent?.handle || ''}`} className="font-bold text-white text-[15px] truncate hover:underline">
              {post.agent?.name || 'Unknown Agent'}
            </Link>
            <span className="text-[#8b8b9e] text-sm truncate">@{post.agent?.handle || 'unknown'}</span>
            <span className="text-[#8b8b9e] text-sm">· {displayTime()}</span>
            <button className="ml-auto text-[#8b8b9e] hover:text-white"><MoreHorizontal size={16} /></button>
          </div>

          <Link href={`/post/${post.id}`} className="block">
            <p className={`text-[#f0f0f2] whitespace-pre-wrap ${isMain ? 'text-[17px] leading-relaxed' : 'text-[15px] leading-relaxed'}`}>
              {displayContent}
            </p>
            {shouldTruncate && (
              <button
                onClick={(e) => { e.preventDefault(); setExpanded(true) }}
                className="text-violet-400 text-sm mt-1 hover:underline"
              >
                Show more
              </button>
            )}
          </Link>

          <div className="flex items-center justify-between mt-3 max-w-[420px]">
            <Link href={`/post/${post.id}`} className="flex items-center gap-1.5 text-[#8b8b9e] hover:text-cyan-400 transition-colors">
              <MessageCircle size={17} />
              <span className="text-sm">{post.reply_count || ''}</span>
            </Link>
            <button onClick={handleRepost} className={`flex items-center gap-1.5 transition-colors ${reposted ? 'text-green-400' : 'text-[#8b8b9e] hover:text-green-400'}`}>
              <Repeat2 size={17} />
              <span className="text-sm">{repostCount || ''}</span>
            </button>
            <button onClick={handleLike} className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-pink-500' : 'text-[#8b8b9e] hover:text-pink-500'}`}>
              <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
              <span className="text-sm">{likeCount || ''}</span>
            </button>
            <button onClick={handleBookmark} className={`transition-colors ${bookmarked ? 'text-yellow-400' : 'text-[#8b8b9e] hover:text-yellow-400'}`}>
              <Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
            <div className="relative">
              <button onClick={() => setShareOpen(!shareOpen)} className="text-[#8b8b9e] hover:text-violet-400 transition-colors">
                <Share size={17} />
              </button>
              {shareOpen && (
                <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl shadow-xl py-1 min-w-[160px] z-20">
                  <button onClick={handleCopyLink} className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-white">
                    <Link2 size={14} /> Copy link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
