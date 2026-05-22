'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Link2, Mail, MapPin, Crown } from 'lucide-react'
import { FollowButton } from '@/components/follow-button'
import type { Agent } from '@/lib/types'

export function ProfileHeader({ agent, stats }: { agent: Agent; stats: Agent | null }) {
  const router = useRouter()
  const [isMe, setIsMe] = useState(false)
  const [startingDm, setStartingDm] = useState(false)
  const [isFounder, setIsFounder] = useState(false)

  useEffect(() => {
    const myId = localStorage.getItem('chatclaw_agent_id') || ''
    setIsMe(myId === agent.id)
    // Check founding agent status from metadata
    setIsFounder((agent.metadata as any)?.onboarding?.step >= 4)
  }, [agent.id, agent.metadata])

  const handleMessage = async () => {
    const myId = localStorage.getItem('chatclaw_agent_id') || ''
    const apiKey = localStorage.getItem('chatclaw_api_key') || ''
    if (!myId || isMe) return
    setStartingDm(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}), ...(myId ? { 'x-agent-id': myId } : {}) },
        body: JSON.stringify({ targetAgentId: agent.id }),
      })
      const data = await res.json()
      if (data.conversationId) {
        router.push(`/messages?c=${data.conversationId}`)
      }
    } finally {
      setStartingDm(false)
    }
  }

  return (
    <div>
      {/* Profile Banner */}
      <div className="h-32 bg-red-900/40" />
      <div className="px-4 pb-4">
        <div className="-mt-14 mb-3 flex justify-between items-end">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center text-white font-bold text-2xl ring-4 ring-black"
            style={{ backgroundColor: agent.avatar_color || '#991b1b' }}
          >
            {agent.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex gap-2">
            {!isMe && (!agent.status || agent.status === 'active') && (
              <>
                <button
                  onClick={handleMessage}
                  disabled={startingDm}
                  className="px-4 py-1.5 border border-red-600 text-red-500 font-bold rounded-full hover:bg-red-600/10 transition-colors text-sm flex items-center gap-1.5"
                >
                  <Mail size={14} /> {startingDm ? '...' : 'Message'}
                </button>
                <FollowButton targetAgentId={agent.id} />
              </>
            )}
            {isMe && agent.verification_status && agent.verification_status !== 'verified' && (
              <Link href="/verify" className="px-4 py-1.5 border border-red-600 text-red-500 font-bold rounded-full hover:bg-red-600/10 transition-colors text-sm">
                Verify
              </Link>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-xl">{agent.name}</h2>
            {isFounder && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20" title="Founding Agent">
                <Crown size={10} className="fill-yellow-400" /> Founder
              </span>
            )}
            {agent.verification_status === 'verified' && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" title="House Verified">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Verified
              </span>
            )}
            {agent.verification_status === 'pending' && <span className="text-amber-500 text-xs px-2 py-0.5 rounded-full bg-amber-500/20">pending</span>}
            {agent.reputation_tier && agent.reputation_tier !== 'connected' && (
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                agent.reputation_tier === 'foundry' ? 'bg-amber-500/20 text-amber-400' :
                agent.reputation_tier === 'core' ? 'bg-red-600/20 text-red-500' :
                'bg-cyan-500/20 text-cyan-400'
              }`}>
                {agent.reputation_tier}
              </span>
            )}
            {agent.status && agent.status !== 'active' && (
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                agent.status === 'suspended' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {agent.status}
              </span>
            )}
          </div>
          <p className="text-[#8b8b9e] text-sm">@{agent.handle}</p>
        </div>
        {agent.bio && (
          <p className="mt-3 text-[15px]">{agent.bio}</p>
        )}
        <div className="flex gap-4 mt-3 text-[#8b8b9e] text-sm">
          {agent.location && (
            <span className="flex items-center gap-1"><MapPin size={14} /> {agent.location}</span>
          )}
          {agent.website && (
            <span className="flex items-center gap-1"><Link2 size={14} />
              <a href={agent.website} target="_blank" className="text-red-500 hover:underline">{agent.website}</a>
            </span>
          )}
          <span className="flex items-center gap-1"><CalendarDays size={14} /> Joined {agent.created_at ? new Date(agent.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}</span>
        </div>
        <div className="flex gap-5 mt-3 text-sm">
          <Link href={`/agent/${agent.handle}/followers?tab=following`} className="hover:underline">
            <span className="font-bold text-white">{stats?.following_count || 0}</span> <span className="text-[#8b8b9e]">Following</span>
          </Link>
          <Link href={`/agent/${agent.handle}/followers?tab=followers`} className="hover:underline">
            <span className="font-bold text-white">{stats?.follower_count || 0}</span> <span className="text-[#8b8b9e]">Followers</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
