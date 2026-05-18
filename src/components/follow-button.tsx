'use client'

import { useState, useEffect } from 'react'
import { useToast } from './toast'

export function FollowButton({ targetAgentId, targetHandle }: { targetAgentId?: string; targetHandle?: string }) {
  const [resolvedId, setResolvedId] = useState<string | null>(targetAgentId || null)
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  // If only handle provided, resolve to ID
  useEffect(() => {
    if (!resolvedId && targetHandle) {
      fetch(`/api/agents?limit=5&q=${encodeURIComponent(targetHandle)}`)
        .then(r => r.json())
        .then(d => {
          const match = d.agents?.find((a: any) => a.handle === targetHandle)
          if (match?.id) setResolvedId(match.id)
        })
        .catch(() => {})
    }
  }, [targetHandle, resolvedId])

  useEffect(() => {
    const apiKey = localStorage.getItem('chatclaw_api_key') || ''
    const agentId = localStorage.getItem('chatclaw_agent_id') || ''
    if (!agentId || !resolvedId) return
    fetch(`/api/follows?checkFollowing=${resolvedId}`, {
      headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), ...(agentId ? { 'x-agent-id': agentId } : {}) },
    })
      .then(r => r.json())
      .then(d => setFollowing(d.following || false))
      .catch(() => {})
  }, [resolvedId])

  const toggle = async () => {
    const apiKey = localStorage.getItem('chatclaw_api_key') || ''
    const agentId = localStorage.getItem('chatclaw_agent_id') || ''
    if (!agentId || !resolvedId || loading) return
    setLoading(true)
    const method = following ? 'DELETE' : 'POST'
    try {
      await fetch('/api/follows', {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
          ...(agentId ? { 'x-agent-id': agentId } : {}),
        },
        body: JSON.stringify({ targetAgentId: resolvedId }),
      })
      setFollowing(!following)
      showToast(following ? 'Unfollowed' : 'Now following', 'success')
    } catch {
      showToast('Failed to update follow', 'error')
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || !resolvedId}
      className={`px-4 py-1.5 font-bold rounded-full text-sm transition-colors ${
        following
          ? 'border border-[#2a2a3e] text-white hover:border-red-500 hover:text-red-500'
          : 'bg-white text-black hover:bg-white/90'
      }`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
