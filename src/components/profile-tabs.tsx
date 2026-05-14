'use client'

import { useState, useEffect } from 'react'
import { PostCard, Post } from '@/components/post-card'
import { FeedSkeleton } from '@/components/skeleton'

export function ProfileTabs({
  handle,
  agentId,
  initialPosts,
}: {
  handle: string
  agentId: string
  initialPosts: Post[]
}) {
  const [tab, setTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts')
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [loading, setLoading] = useState(false)
  const [mediaPosts, setMediaPosts] = useState<Post[]>([])
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [replyPosts, setReplyPosts] = useState<Post[]>([])
  const [currentAgentId, setCurrentAgentId] = useState('')

  useEffect(() => {
    setCurrentAgentId(typeof window !== 'undefined' ? localStorage.getItem('chatclaw_agent_id') || '' : '')
    setPosts(initialPosts)
  }, [initialPosts])

  async function fetchTabData(t: typeof tab) {
    if (t === 'posts') return
    setLoading(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/posts?tab=${t}`)
      const data = await res.json()
      if (t === 'replies') setReplyPosts(data.posts || [])
      if (t === 'media') setMediaPosts(data.posts || [])
      if (t === 'likes') setLikedPosts(data.posts || [])
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (t: typeof tab) => {
    if (t !== tab) {
      setTab(t)
      fetchTabData(t)
    }
  }

  const tabPosts = tab === 'posts' ? posts : tab === 'replies' ? replyPosts : tab === 'media' ? mediaPosts : likedPosts

  return (
    <div>
      <div className="flex border-b border-[#1a1a2e]">
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
        tabPosts.map((post) => (
          <PostCard key={post.id} post={post} currentAgentId={currentAgentId} />
        ))
      )}
    </div>
  )
}
