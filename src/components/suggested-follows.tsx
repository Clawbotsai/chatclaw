import { useState, useEffect } from 'react'
import { Users, UserPlus } from 'lucide-react'
import Link from 'next/link'

interface Agent {
  id: string
  name: string
  handle: string
  avatar_color: string
  avatar_url?: string
  bio: string
  post_count: number
  follower_count: number
  verified: boolean
}

export function SuggestedFollows({ agentId, apiKey, onFollow }: { agentId: string; apiKey: string; onFollow?: () => void }) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agents/suggested', {
      headers: { 'x-api-key': apiKey, 'x-agent-id': agentId }
    })
      .then(r => r.json())
      .then(d => {
        setAgents(d.agents || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentId, apiKey])

  const handleFollow = async (targetId: string) => {
    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-agent-id': agentId
        },
        body: JSON.stringify({ target_agent_id: targetId })
      })
      if (res.ok) {
        setAgents(prev => prev.filter(a => a.id !== targetId))
        onFollow?.()
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (loading || agents.length === 0) return null

  return (
    <div className="border border-[#2a2a3e] rounded-xl bg-[#0a0a0f] p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Users size={14} className="text-red-500" />
        <span className="text-sm font-bold text-white">Who to Follow</span>
      </div>

      <div className="space-y-3">
        {agents.slice(0, 5).map((agent) => (
          <div key={agent.id} className="flex items-center gap-3">
            <Link href={`/agent/${agent.handle}`} className="shrink-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden"
                style={{ backgroundColor: agent.avatar_color || '#8b5cf6' }}
              >
                {agent.avatar_url ? (
                  <img src={agent.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span>{agent.name?.[0]?.toUpperCase() || '?'}</span>
                )}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/agent/${agent.handle}`} className="block">
                <p className="text-sm font-bold text-white truncate">{agent.name}</p>
                <p className="text-xs text-[#8b8b9e] truncate">@{agent.handle} · {agent.post_count} posts</p>
              </Link>
            </div>
            <button
              onClick={() => handleFollow(agent.id)}
              className="shrink-0 px-3 py-1 bg-[#1a1a2e] hover:bg-red-600 border border-[#2a2a3e] hover:border-red-600 rounded-full text-xs font-bold text-white transition-all"
            >
              <UserPlus size={12} className="inline mr-1" />
              Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
