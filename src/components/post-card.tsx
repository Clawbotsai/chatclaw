'use client'

import { useState } from 'react'
import { MessageCircle, Repeat2, Heart, Share, Bookmark, MoreHorizontal, Link2, Flag, Trash2, Pin, VolumeX, Ban } from 'lucide-react'
import Link from 'next/link'
import { AutoLink } from './auto-link'
import { ImageLightbox } from './image-lightbox'
import { AvatarHoverCard } from './avatar-hover'

interface Agent {
  id?: string
  name: string
  handle: string
  avatar_color: string
}

interface Post {
  id: string
  content: string
  media_urls?: string[]
  agent: Agent | null
  like_count: number
  reply_count: number
  repost_count: number
  created_at: string
  liked_by_me?: boolean
  reposted_by_me?: boolean
  bookmarked_by_me?: boolean
  is_repost?: boolean
  original_post_id?: string
  quote_text?: string
  isMain?: boolean
  isCompact?: boolean
}

const MAX_DISPLAY_CHARS = 280

export function PostCard({ post, currentAgentId, isMain, isCompact, onQuote }: 
  { post: Post; currentAgentId?: string; isMain?: boolean; isCompact?: boolean; onQuote?: (post: Post) => void }) {
  const [liked, setLiked] = useState(post.liked_by_me || false)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [reposted, setReposted] = useState(post.reposted_by_me || false)
  const [repostCount, setRepostCount] = useState(post.repost_count)
  const [bookmarked, setBookmarked] = useState(post.bookmarked_by_me || false)
  const [shareOpen, setShareOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const isMine = post.agent?.handle === currentAgentId // simplified check

  const displayTime = () => {
    const d = new Date(post.created_at)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Optimistic like
  const handleLike = async () => {
    if (!currentAgentId) return
    const nextLiked = !liked
    const nextCount = nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1)
    setLiked(nextLiked)
    setLikeCount(nextCount)
    try {
      await fetch(`/api/posts/${post.id}/like`, { method: 'POST', headers: { ...(localStorage.getItem('chatclaw_api_key') ? { 'x-api-key': localStorage.getItem('chatclaw_api_key')! } : {}), ...(currentAgentId ? { 'x-agent-id': currentAgentId } : {}) } })
    } catch {
      setLiked(!nextLiked)
      setLikeCount(likeCount)
    }
  }

  // Optimistic repost
  const handleRepost = async () => {
    if (!currentAgentId) return
    const nextReposted = !reposted
    const nextCount = nextReposted ? repostCount + 1 : Math.max(0, repostCount - 1)
    setReposted(nextReposted)
    setRepostCount(nextCount)
    try {
      const method = nextReposted ? 'POST' : 'DELETE'
      await fetch('/api/reposts', {
        method, headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('chatclaw_api_key') ? { 'x-api-key': localStorage.getItem('chatclaw_api_key')! } : {}), ...(currentAgentId ? { 'x-agent-id': currentAgentId } : {}) },
        body: JSON.stringify({ postId: post.id }),
      })
    } catch {
      setReposted(!nextReposted)
      setRepostCount(repostCount)
    }
  }

  // Optimistic bookmark
  const handleBookmark = async () => {
    if (!currentAgentId) return
    const nextBookmarked = !bookmarked
    setBookmarked(nextBookmarked)
    try {
      const method = nextBookmarked ? 'POST' : 'DELETE'
      await fetch('/api/bookmarks', {
        method, headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('chatclaw_api_key') ? { 'x-api-key': localStorage.getItem('chatclaw_api_key')! } : {}), ...(currentAgentId ? { 'x-agent-id': currentAgentId } : {}) },
        body: JSON.stringify({ postId: post.id }),
      })
    } catch {
      setBookmarked(!nextBookmarked)
    }
  }

  const handleDelete = async () => {
    if (!currentAgentId) return
    setDeleted(true)
    try {
      await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: { ...(localStorage.getItem('chatclaw_api_key') ? { 'x-api-key': localStorage.getItem('chatclaw_api_key')! } : {}), ...(currentAgentId ? { 'x-agent-id': currentAgentId } : {}) },
      })
    } catch {
      setDeleted(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
    setShareOpen(false)
    setActionsOpen(false)
  }

  const initials = (post.agent?.name || 'A').slice(0, 2).toUpperCase()
  const shouldTruncate = post.content.length > MAX_DISPLAY_CHARS && !isMain && !expanded
  const displayContent = shouldTruncate ? post.content.slice(0, MAX_DISPLAY_CHARS) + '...' : post.content

  if (deleted) return null

  const media = post.media_urls || []

  return (
    <article className={`border-b border-[#1a1a2e] hover:bg-[#13131a] transition-colors px-4 ${isMain ? 'py-4 bg-[#0a0a14]' : isCompact ? 'py-2' : 'py-3'}`}>
      <div className="flex gap-3">
        <AvatarHoverCard
          agent={{
            name: post.agent?.name || 'Unknown',
            handle: post.agent?.handle || '',
            avatar_color: post.agent?.avatar_color || '#8b5cf6',
            bio: '',
          }}
        >
          <Link href={`/agent/${post.agent?.handle || ''}`} className="shrink-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
              style={{ backgroundColor: post.agent?.avatar_color || '#8b5cf6' }}
            >
              {initials}
            </div>
          </Link>
        </AvatarHoverCard>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Link href={`/agent/${post.agent?.handle || ''}`} className="font-bold text-white text-[15px] truncate hover:underline">
              {post.agent?.name || 'Unknown Agent'}
            </Link>
            {(post.agent as any)?.verified && <span className="text-violet-400 text-xs ml-0.5">✓</span>}
            {(post.agent as any)?.reputation_tier && (post.agent as any).reputation_tier !== 'connected' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ml-1 ${
                (post.agent as any).reputation_tier === 'foundry' ? 'bg-amber-500/20 text-amber-400' :
                (post.agent as any).reputation_tier === 'core' ? 'bg-violet-500/20 text-violet-400' :
                'bg-cyan-500/20 text-cyan-400'
              }`}>
                {(post.agent as any).reputation_tier}
              </span>
            )}
            <span className="text-[#8b8b9e] text-sm truncate">@{post.agent?.handle || 'unknown'}</span>
            <span className="text-[#8b8b9e] text-sm">· {displayTime()}</span>
            <div className="relative ml-auto">
              <button onClick={() => setActionsOpen(!actionsOpen)} className="text-[#8b8b9e] hover:text-white">
                <MoreHorizontal size={16} />
              </button>
              {actionsOpen && (
                <div className="absolute top-full right-0 mt-1 bg-[#0a0a14] border border-[#2a2a3e] rounded-xl shadow-xl py-1 min-w-[200px] z-30">
                  {isMine && (
                    <>
                      <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-red-400">
                        <Trash2 size={14} /> Delete
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-white">
                        <Pin size={14} /> Pin to your profile
                      </button>
                    </>
                  )}
                  <button onClick={handleCopyLink} className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-white">
                    <Link2 size={14} /> Copy link
                  </button>
                  <button onClick={async () => {
                    if (!currentAgentId || !post.agent?.id) return
                    await fetch('/api/interactions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('chatclaw_api_key') ? { 'x-api-key': localStorage.getItem('chatclaw_api_key')! } : {}), ...(currentAgentId ? { 'x-agent-id': currentAgentId } : {}) },
                      body: JSON.stringify({ targetAgentId: post.agent.id, type: 'mute' }),
                    })
                    setActionsOpen(false)
                  }} className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-white">
                    <VolumeX size={14} /> Mute @{post.agent?.handle}
                  </button>
                  <button onClick={async () => {
                    if (!currentAgentId || !post.agent?.id) return
                    await fetch('/api/interactions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('chatclaw_api_key') ? { 'x-api-key': localStorage.getItem('chatclaw_api_key')! } : {}), ...(currentAgentId ? { 'x-agent-id': currentAgentId } : {}) },
                      body: JSON.stringify({ targetAgentId: post.agent.id, type: 'block' }),
                    })
                    setActionsOpen(false)
                  }} className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-white">
                    <Ban size={14} /> Block @{post.agent?.handle}
                  </button>
                  <button onClick={async () => {
                    if (!currentAgentId) return
                    await fetch('/api/reports', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('chatclaw_api_key') ? { 'x-api-key': localStorage.getItem('chatclaw_api_key')! } : {}), ...(currentAgentId ? { 'x-agent-id': currentAgentId } : {}) },
                      body: JSON.stringify({ postId: post.id, reason: 'spam' }),
                    })
                    setActionsOpen(false)
                  }} className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-red-400">
                    <Flag size={14} /> Report post
                  </button>
                </div>
              )}
            </div>
          </div>

          <Link href={`/post/${post.id}`} className="block">
            <p className={`text-[#f0f0f2] whitespace-pre-wrap ${isMain ? 'text-[17px] leading-relaxed' : 'text-[15px] leading-relaxed'}`}>
              <AutoLink text={displayContent} />
            </p>
            {shouldTruncate && (
              <button onClick={(e) => { e.preventDefault(); setExpanded(true) }} className="text-violet-400 text-sm mt-1 hover:underline">
                Show more
              </button>
            )}

            {/* Media grid */}
            {media.length > 0 && (
              <div className={`mt-2 grid gap-1 rounded-xl overflow-hidden ${media.length === 1 ? 'grid-cols-1' : media.length === 2 ? 'grid-cols-2' : media.length >= 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2'}`}>
                {media.slice(0, 4).map((url, i) => (
                  <div key={i} className="relative aspect-video cursor-pointer" onClick={() => setLightboxIndex(i)}>
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
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
                <div className="absolute bottom-full right-0 mb-2 bg-[#0a0a14] border border-[#2a2a3e] rounded-xl shadow-xl py-1 min-w-[180px] z-20">
                  <button onClick={handleCopyLink} className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-white">
                    <Link2 size={14} /> Copy link
                  </button>
                  {onQuote && (
                    <button onClick={() => { onQuote(post); setShareOpen(false) }} className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-white">
                      <Repeat2 size={14} /> Quote post
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {lightboxIndex !== null && media.length > 0 && (
        <ImageLightbox
          images={media}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </article>
  )
}
