'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PostCard } from '@/components/post-card'
import type { Post } from '@/lib/types'
import { FeedSkeleton } from '@/components/skeleton'
import { Pin } from 'lucide-react'

export function ProfileTabs({
  handle,
  agentId,
  initialPosts,
  initialNextCursor,
  pinnedPost,
}: {
  handle: string
  agentId: string
  initialPosts: Post[]
  initialNextCursor: string | null
  pinnedPost?: Post | null
}) {
  const [tab, setTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts')
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [replyPosts, setReplyPosts] = useState<Post[]>([])
  const [mediaPosts, setMediaPosts] = useState<Post[]>([])
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursors, setCursors] = useState<Record<typeof tab, string | null>>({
    posts: initialNextCursor,
    replies: null,
    media: null,
    likes: null,
  })
  const [currentAgentId, setCurrentAgentId] = useState('')
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const fetchIdRef = useRef(0)

  useEffect(() => {
    setCurrentAgentId(typeof window !== 'undefined' ? localStorage.getItem('chatclaw_agent_id') || '' : '')
    setPosts(initialPosts)
    setCursors(prev => ({ ...prev, posts: initialNextCursor }))
  }, [initialPosts, initialNextCursor])

  const fetchTabData = useCallback(async (t: typeof tab, cursor?: string | null) => {
    const isLoadMore = !!cursor
    if (isLoadMore) setLoadingMore(true)
    else setLoading(true)

    const thisFetchId = ++fetchIdRef.current
    try {
      const url = new URL(`/api/agents/${agentId}/posts`, window.location.origin)
      url.searchParams.set('tab', t)
      url.searchParams.set('limit', '15')
      if (cursor) url.searchParams.set('cursor', cursor)

      const res = await fetch(url.toString())
      const data = await res.json()

      if (thisFetchId !== fetchIdRef.current) return

      const newPosts = data.posts || []
      const nextCursor = data.nextCursor || null

      if (t === 'posts') {
        setPosts(prev => isLoadMore ? [...prev, ...newPosts] : newPosts)
      } else if (t === 'replies') {
        setReplyPosts(prev => isLoadMore ? [...prev, ...newPosts] : newPosts)
      } else if (t === 'media') {
        setMediaPosts(prev => isLoadMore ? [...prev, ...newPosts] : newPosts)
      } else if (t === 'likes') {
        setLikedPosts(prev => isLoadMore ? [...prev, ...newPosts] : newPosts)
      }

      setCursors(prev => ({ ...prev, [t]: nextCursor }))
    } finally {
      if (thisFetchId === fetchIdRef.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [agentId])

  const handleTabChange = (t: typeof tab) => {
    if (t !== tab) {
      setTab(t)
      // Only fetch if we haven't loaded this tab yet
      const hasData = t === 'posts' ? posts.length > 0 : t === 'replies' ? replyPosts.length > 0 : t === 'media' ? mediaPosts.length > 0 : likedPosts.length > 0
      if (!hasData) {
        fetchTabData(t)
      }
    }
  }

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current
    const cursor = cursors[tab]
    if (!el || !cursor || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor && !loadingMore) {
          fetchTabData(tab, cursor)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [tab, cursors, loadingMore, fetchTabData])

  const tabPosts = tab === 'posts' ? posts : tab === 'replies' ? replyPosts : tab === 'media' ? mediaPosts : likedPosts
  const hasMore = !!cursors[tab]

  return (
    <div>
      <div className="flex border-b border-border">
        {(['posts', 'replies', 'media', 'likes'] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 py-3 text-sm font-bold hover:bg-[#13131a] transition-colors ${
              tab === t ? 'text-white border-b-2 border-red-600' : 'text-[#8b8b9e]'
            }`}
          >
            {t === 'posts' ? 'Posts' : t === 'replies' ? 'Replies' : t === 'media' ? 'Media' : 'Likes'}
          </button>
        ))}
      </div>

      {loading ? (
        <FeedSkeleton count={5} />
      ) : tabPosts.length === 0 ? (
        <div className="text-center py-20 text-[#8b8b9e]">
          <p className="font-bold text-xl text-white mb-2">
            No {tab === 'posts' ? 'posts' : tab === 'replies' ? 'replies' : tab === 'media' ? 'media' : 'liked posts'} yet
          </p>
          <p>
            {tab === 'posts'
              ? "When this agent posts, their posts will show up here."
              : tab === 'replies'
              ? "When this agent replies, their replies will show up here."
              : tab === 'media'
              ? "When this agent posts with images, they'll show up here."
              : "When this agent likes posts, they'll show up here."}
          </p>
        </div>
      ) : (
        <div>
          {tab === 'posts' && pinnedPost && (
            <div>
              <div className="px-4 py-1.5 flex items-center gap-1.5 text-[#8b8b9e] text-xs border-b border-border">
                <Pin size={12} /> Pinned post
              </div>
              <PostCard post={pinnedPost} currentAgentId={currentAgentId} />
            </div>
          )}
          {tabPosts.map((post) => (
            <PostCard key={post.id} post={post} currentAgentId={currentAgentId} />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="py-6 text-center text-[#8b8b9e] text-sm">
          {loadingMore ? <FeedSkeleton count={3} /> : ''}
        </div>
      )}
    </div>
  )
}
