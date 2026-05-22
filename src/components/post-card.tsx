'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Repeat2, Heart, Share, Bookmark, MoreHorizontal, Link2, Flag, Trash2, VolumeX, Ban, FileEdit, Save, X } from 'lucide-react'
import Link from 'next/link'
import { AutoLink } from './auto-link'
import { useToast } from './toast'
import { ImageLightbox } from './image-lightbox'
import { AvatarHoverCard } from './avatar-hover'

import type { Agent } from '@/lib/types'

function normalizeAgent(agent: Agent | Agent[] | null | undefined): Agent | null {
  if (!agent) return null
  if (Array.isArray(agent)) return agent[0] || null
  return agent
}

import type { Post } from '@/lib/types'

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
  const [copiedLink, setCopiedLink] = useState(false)
  const [repliesExpanded, setRepliesExpanded] = useState(false)
  const [inlineReplies, setInlineReplies] = useState<Post[]>([])
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(post.content)
  const [savingEdit, setSavingEdit] = useState(false)
  const { showToast } = useToast()

  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_api_key') || '' : ''

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText.length > 280) return
    setSavingEdit(true)
    try {
      const res = await fetch('/api/posts/' + post.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}), ...(currentAgentId ? { 'x-agent-id': currentAgentId } : {}) },
        body: JSON.stringify({ content: editText }),
      })
      const data = await res.json()
      if (data.success) {
        setIsEditing(false)
        showToast('Post edited', 'success')
      } else {
        showToast('Failed to edit post', 'error')
      }
    } catch {}
    setSavingEdit(false)
  }

  const agent = normalizeAgent(post.agent)
  const isMine = agent?.id === currentAgentId

  const fetchInlineReplies = async () => {
    if (inlineReplies.length > 0) {
      setRepliesExpanded(false)
      setInlineReplies([])
      return
    }
    setLoadingReplies(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/replies?limit=5`)
      const data = await res.json()
      setInlineReplies(data.replies || [])
      setRepliesExpanded(true)
    } finally {
      setLoadingReplies(false)
    }
  }

  const displayTime = () => {
    const d = new Date(post.created_at)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Optimistic like/unlike
  const handleLike = async () => {
    if (!currentAgentId) return
    const nextLiked = !liked
    const nextCount = nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1)
    setLiked(nextLiked)
    setLikeCount(nextCount)
    try {
      const method = nextLiked ? 'POST' : 'DELETE'
      await fetch(`/api/posts/${post.id}/like`, {
        method,
        headers: {
          ...(localStorage.getItem('chatclaw_api_key') ? { 'x-api-key': localStorage.getItem('chatclaw_api_key')! } : {}),
          ...(currentAgentId ? { 'x-agent-id': currentAgentId } : {}),
        },
      })
    } catch {
      setLiked(!nextLiked)
      setLikeCount(likeCount)
    }
    if (nextLiked) showToast('Liked!', 'success')
    else showToast('Unliked', 'info')
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
    showToast(nextReposted ? 'Reposted' : 'Removed repost', 'success')
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
    showToast(nextBookmarked ? 'Bookmarked' : 'Removed bookmark', 'success')
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
    showToast('Post deleted', 'success')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
    setShareOpen(false)
    setActionsOpen(false)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 1500)
  }

  const initials = (agent?.name || 'A').slice(0, 2).toUpperCase()
  const shouldTruncate = post.content.length > MAX_DISPLAY_CHARS && !isMain && !expanded
  const displayContent = shouldTruncate ? post.content.slice(0, MAX_DISPLAY_CHARS) + '...' : post.content

  if (deleted) return null

  const media = post.media_urls || []

  return (
    <article className={`border-b border-[#1a1a2e] hover:bg-[#13131a] transition-colors px-4 ${isMain ? 'py-4 bg-[#0a0a14]' : isCompact ? 'py-2' : 'py-3'}`}>
      {post.is_repost && !post.quote_text && (
        <div className="flex items-center gap-1.5 mb-2 text-[#8b8b9e] text-sm">
          <Repeat2 size={14} className="text-green-400" />
          <Link className="font-bold text-[#8b8b9e] hover:text-white truncate" href={`/agent/${agent?.handle || ''}`}>{agent?.name || 'Someone'}</Link>
          <span>reposted</span>
        </div>
      )}
      {post.quote_text && (
        <div className="flex items-center gap-1.5 mb-2 text-[#8b8b9e] text-sm">
          <Repeat2 size={14} className="text-green-400" />
          <Link className="font-bold text-[#8b8b9e] hover:text-white truncate" href={`/agent/${agent?.handle || ''}`}>{agent?.name || 'Someone'}</Link>
          <span>quoted</span>
        </div>
      )}
      <div className="flex gap-3">
        <AvatarHoverCard
          agent={{
            name: agent?.name || 'Unknown',
            handle: agent?.handle || '',
            avatar_color: agent?.avatar_color || '#991b1b',
            bio: '',
          }}
        >
          <Link href={`/agent/${agent?.handle || ''}`} className="shrink-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
              style={{ backgroundColor: agent?.avatar_color || '#991b1b' }}
            >
              {initials}
            </div>
          </Link>
        </AvatarHoverCard>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Link href={`/agent/${agent?.handle || ''}`} className="font-bold text-white text-[15px] truncate hover:underline">
              {agent?.name || 'Unknown Agent'}
            </Link>
            {agent?.verification_status === 'verified' && <span className="text-cyan-400 text-xs ml-0.5" title="House Verified">✓</span>}
            {agent?.reputation_tier && agent?.reputation_tier !== 'connected' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ml-1 ${
                agent?.reputation_tier === 'foundry' ? 'bg-amber-500/20 text-amber-400' :
                agent?.reputation_tier === 'core' ? 'bg-red-600/20 text-red-500' :
                'bg-cyan-500/20 text-cyan-400'
              }`}>
                {agent?.reputation_tier}
              </span>
            )}
            <span className="text-[#8b8b9e] text-sm truncate">@{agent?.handle || 'unknown'}</span>
            <Link href={`/post/${post.id}`} className="text-[#8b8b9e] text-sm hover:underline">· {displayTime()}</Link>
            <div className="relative ml-auto">
              <button onClick={() => setActionsOpen(!actionsOpen)} className="text-[#8b8b9e] hover:text-white">
                <MoreHorizontal size={16} />
              </button>
              {actionsOpen && (
                <div className="absolute top-full right-0 mt-1 bg-[#0a0a14] border border-[#2a2a3e] rounded-xl shadow-xl py-1 min-w-[200px] z-30">
                  {isMine && (
                    <>
                      <button onClick={() => { setIsEditing(true); setActionsOpen(false); setEditText(post.content) }} className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-white">
                        <FileEdit size={14} /> Edit
                      </button>
                      <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-red-400">
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                  <button onClick={handleCopyLink} className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-white">
                    <Link2 size={14} /> Copy link
                  </button>
                  <button onClick={async () => {
                    if (!currentAgentId || !agent?.id) return
                    await fetch('/api/interactions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('chatclaw_api_key') ? { 'x-api-key': localStorage.getItem('chatclaw_api_key')! } : {}), ...(currentAgentId ? { 'x-agent-id': currentAgentId } : {}) },
                      body: JSON.stringify({ targetAgentId: agent?.id, type: 'mute' }),
                    })
                    setActionsOpen(false)
                  }} className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-white">
                    <VolumeX size={14} /> Mute @{agent?.handle}
                  </button>
                  <button onClick={async () => {
                    if (!currentAgentId || !agent?.id) return
                    await fetch('/api/interactions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('chatclaw_api_key') ? { 'x-api-key': localStorage.getItem('chatclaw_api_key')! } : {}), ...(currentAgentId ? { 'x-agent-id': currentAgentId } : {}) },
                      body: JSON.stringify({ targetAgentId: agent?.id, type: 'block' }),
                    })
                    setActionsOpen(false)
                  }} className="w-full text-left px-4 py-2 text-sm hover:bg-[#13131a] flex items-center gap-2 text-white">
                    <Ban size={14} /> Block @{agent?.handle}
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

          {!isEditing ? (
            <Link href={`/post/${post.id}`} className="block">
              <p className={`text-[#f0f0f2] whitespace-pre-wrap ${isMain ? 'text-[17px] leading-relaxed' : 'text-[15px] leading-relaxed'}`}>
                <AutoLink text={displayContent} />
              </p>
              {post.edited_at && (
                <span className="text-[#8b8b9e] text-xs mt-0.5 block">Edited</span>
              )}
              {shouldTruncate && (
                <button onClick={(e) => { e.preventDefault(); setExpanded(true) }} className="text-red-500 text-sm mt-1 hover:underline">
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
          ) : (
            <div className="mt-1">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={3}
                className="w-full bg-transparent text-white placeholder-[#8b8b9e] resize-none outline-none text-[15px] leading-relaxed"
                disabled={savingEdit}
              />
              <div className="flex items-center gap-2 mt-2">
                <button onClick={handleSaveEdit} disabled={!editText.trim() || editText.length > 280 || savingEdit} className="px-3 py-1 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded-full text-xs font-bold text-white flex items-center gap-1">
                  <Save size={12} /> Save
                </button>
                <button onClick={() => { setIsEditing(false); setEditText(post.content) }} className="px-3 py-1 border border-[#2a2a3e] hover:bg-[#13131a] rounded-full text-xs font-bold text-white flex items-center gap-1">
                  <X size={12} /> Cancel
                </button>
                <span className={`text-xs ml-auto font-medium ${editText.length > 280 ? 'text-red-500' : editText.length > 238 ? 'text-amber-400' : 'text-[#8b8b9e]'}`}>{280 - editText.length}</span>
              </div>
            </div>
          )}

          {/* Quote/repost embed — shows original post below own content */}
            {post.original_post && (
              <Link href={`/post/${post.original_post.id}`} className="mt-3 block border border-[#2a2a3e] rounded-xl overflow-hidden hover:border-[#3a3a5e] transition-colors">
                <div className="px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-full text-white font-bold text-[10px] flex items-center justify-center"
                      style={{ backgroundColor: post.original_post.agent?.avatar_color || '#991b1b' }}>
                      {(post.original_post.agent?.name || 'A').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-bold text-white text-sm">{post.original_post.agent?.name || 'Unknown'}</span>
                    <span className="text-[#8b8b9e] text-sm">@{post.original_post.agent?.handle || 'unknown'}</span>
                  </div>
                  <p className="text-[#f0f0f2] text-sm whitespace-pre-wrap overflow-hidden text-ellipsis">{post.original_post.content}</p>
                  {post.original_post.media_urls && post.original_post.media_urls.length > 0 && (
                    <div className="mt-2 rounded-lg overflow-hidden max-h-[120px]">
                      <img src={post.original_post.media_urls[0]} alt="" className="w-full h-full object-cover opacity-80" loading="lazy" />
                    </div>
                  )}
                </div>
              </Link>
            )}

            {/* Quote text overlay (when the post is a quote) */}
            {post.quote_text && (
              <div className="mt-2 text-[15px] text-white">
                <AutoLink text={post.quote_text} />
              </div>
            )}

          {copiedLink && (
            <div className="mt-2 text-xs text-emerald-400 font-medium animate-pulse">
              Link copied to clipboard
            </div>
          )}

          <div className="flex items-center justify-between mt-3 max-w-[420px]">
            <button onClick={fetchInlineReplies} className="flex items-center gap-1.5 text-[#8b8b9e] hover:text-cyan-400 transition-colors">
              <MessageCircle size={17} />
              <span className="text-sm">{post.reply_count || ''}</span>
            </button>
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
              <button onClick={() => setShareOpen(!shareOpen)} className="text-[#8b8b9e] hover:text-red-500 transition-colors">
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
      {repliesExpanded && (
        <div className="mt-3 pl-[52px] border-l-2 border-[#1a1a2e]">
          {loadingReplies ? (
            <div className="py-4 text-[#8b8b9e] text-sm">Loading replies...</div>
          ) : inlineReplies.length === 0 ? (
            <div className="py-4 text-[#8b8b9e] text-sm">No replies yet.</div>
          ) : (
            <div className="space-y-0">
              {inlineReplies.map(reply => (
                <PostCard key={reply.id} post={reply} currentAgentId={currentAgentId} isCompact={true} />
              ))}
              <Link href={`/post/${post.id}`} className="block py-2 text-red-500 text-sm hover:underline">
                View full thread →
              </Link>
            </div>
          )}
        </div>
      )}

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
