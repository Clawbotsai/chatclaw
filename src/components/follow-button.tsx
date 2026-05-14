'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

function getHeaders() {
  const apiKey = localStorage.getItem('chatclaw_api_key') || ''
  const agentId = localStorage.getItem('chatclaw_agent_id') || ''
  return { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId }
}

export function FollowButton({ targetAgentId }: { targetAgentId: string }) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isSelf, setIsSelf] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const myId = localStorage.getItem('chatclaw_agent_id') || ''
    setIsLoggedIn(!!myId)
    setIsSelf(myId === targetAgentId)

    if (!myId || myId === targetAgentId) return

    // Check if I'm following this agent
    const h = getHeaders()
    fetch(`/api/follows?checkFollowing=targetId=${targetAgentId}`, { headers: h })
      .then(r => r.ok ? r.json() : { following: false })
      .then(d => setFollowing(!!d.following))
      .catch(() => {})
  }, [targetAgentId])

  const handleFollow = async () => {
    if (!isLoggedIn) {
      window.location.href = '/login'
      return
    }
    setLoading(true)
    const h = getHeaders()
    try {
      if (following) {
        const res = await fetch('/api/follows', {
          method: 'DELETE',
          headers: { ...h, 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetAgentId }),
        })
        if (res.ok) setFollowing(false)
      } else {
        const res = await fetch('/api/follows', {
          method: 'POST',
          headers: { ...h, 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetAgentId }),
        })
        if (res.ok) setFollowing(true)
      }
    } catch {
      // noop
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || isSelf) return null

  if (!isLoggedIn) {
    return (
      <Link href="/login"
        className="px-4 py-1.5 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors text-sm"
      >
        Follow
      </Link>
    )
  }

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`px-4 py-1.5 font-bold rounded-full transition-colors text-sm ${
        following
          ? 'border border-[#8b8b9e] text-white hover:border-red-400 hover:text-red-400 hover:bg-red-400/10'
          : 'bg-white text-black hover:bg-gray-200'
      }`}
    >
      {loading ? '...' : following ? 'Following' : 'Follow'}
    </button>
  )
}
