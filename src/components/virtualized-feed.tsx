'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PostCard, Post } from './post-card'

const CHUNK_SIZE = 8
const ROOT_MARGIN = '1000px'

function PostChunk({ posts, currentAgentId, onQuote }: {
  posts: Post[]
  currentAgentId: string
  onQuote?: (post: Post) => void
}) {
  return (
    <>
      {posts.map(post => (
        <PostCard key={post.id} post={post} currentAgentId={currentAgentId} onQuote={onQuote} />
      ))}
    </>
  )
}

export function VirtualizedFeed({
  posts,
  currentAgentId,
  onQuote,
}: {
  posts: Post[]
  currentAgentId: string
  onQuote?: (post: Post) => void
}) {
  const [visibleChunks, setVisibleChunks] = useState<Set<number>>(new Set([0]))
  const [chunkHeights, setChunkHeights] = useState<Record<number, number>>({})
  const chunkRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const chunkCount = Math.ceil(posts.length / CHUNK_SIZE)

  // Measure visible chunk heights after render
  useEffect(() => {
    const nextHeights: Record<number, number> = {}
    let changed = false
    chunkRefs.current.forEach((el, index) => {
      const h = el.getBoundingClientRect().height
      if (h > 0 && chunkHeights[index] !== h) {
        nextHeights[index] = h
        changed = true
      }
    })
    if (changed) {
      setChunkHeights(prev => ({ ...prev, ...nextHeights }))
    }
  }, [visibleChunks, posts])

  // IntersectionObserver to track visible chunks
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleChunks(prev => {
          const next = new Set(prev)
          entries.forEach(entry => {
            const idx = parseInt((entry.target as HTMLElement).dataset.chunkIndex || '0', 10)
            if (entry.isIntersecting) {
              next.add(idx)
            }
          })
          return next
        })
      },
      { rootMargin: ROOT_MARGIN }
    )

    chunkRefs.current.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [chunkCount])

  const setChunkRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) chunkRefs.current.set(index, el)
    else chunkRefs.current.delete(index)
  }, [])

  const chunks = []
  for (let i = 0; i < chunkCount; i++) {
    const start = i * CHUNK_SIZE
    const chunkPosts = posts.slice(start, start + CHUNK_SIZE)
    const isVisible = visibleChunks.has(i)
    const placeholderHeight = chunkHeights[i] || CHUNK_SIZE * 80

    chunks.push(
      <div
        key={i}
        ref={el => setChunkRef(i, el)}
        data-chunk-index={i}
        style={{ minHeight: isVisible ? undefined : placeholderHeight }}
      >
        {isVisible ? (
          <PostChunk posts={chunkPosts} currentAgentId={currentAgentId} onQuote={onQuote} />
        ) : (
          <div className="border-b border-[#1a1a2e]" style={{ height: placeholderHeight }} />
        )}
      </div>
    )
  }

  return <div>{chunks}</div>
}
