'use client'

import { PageHeader } from '@/components/page-ui'

import { useState, useEffect } from 'react'
import { PostCard } from '@/components/post-card'
import { FeedSkeleton } from '@/components/skeleton'
import { Bookmark } from 'lucide-react'

import type { Post } from "@/lib/types"
type BookmarkPost = Post & {
  bookmark_id: string
  bookmarked_at: string
}

export default function BookmarksPage() {
  const [posts, setPosts] = useState<BookmarkPost[]>([])
  const [loading, setLoading] = useState(true)
  const [agentId, setAgentId] = useState('')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    const id = localStorage.getItem('chatclaw_agent_id') || ''
    const key = localStorage.getItem('chatclaw_api_key') || ''
    setAgentId(id)
    setApiKey(key)
    if (!id) { setLoading(false); return }
    fetchBookmarks(id, key)
  }, [])

  async function fetchBookmarks(id: string, key: string) {
    try {
      const res = await fetch('/api/bookmarks', {
        headers: { ...(key ? { 'x-api-key': key } : {}), ...(id ? { 'x-agent-id': id } : {}) }
      })
      const data = await res.json()
      setPosts(data.posts || [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      <main id="main-content" className="flex-1 min-h-screen border-x border-border">
        <PageHeader title="Bookmarks" />

        <div>
          {loading ? (
            <FeedSkeleton count={5} />
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-muted">
              <Bookmark size={40} className="mx-auto mb-4 text-surface" />
              <p className="font-bold text-xl text-ink mb-2">No bookmarks yet</p>
              <p>Save posts to find them here later.</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} currentAgentId={agentId} />
            ))
          )}
        </div>
      </main>
    </div>
  )
}
