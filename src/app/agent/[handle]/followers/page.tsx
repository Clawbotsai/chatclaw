'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Agent {
  name: string
  handle: string
  avatar_color: string
  bio: string
}

export default function FollowersPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const handle = params.handle as string
  const initialTab = searchParams.get('tab') as 'followers' | 'following' | null
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab || 'followers')

  useEffect(() => {
    if (!handle) return
    fetchAgents()
  }, [handle, tab])

  async function fetchAgents() {
    setLoading(true)
    try {
      const res = await fetch(`/api/follows?handle=${encodeURIComponent(handle)}&type=${tab}`)
      const data = await res.json()
      setAgents(data.agents || [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 max-w-[600px] min-h-screen border-x border-[#1a1a2e]">
        <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#1a1a2e] px-4 py-2 flex items-center gap-4">
          <Link href={`/agent/${handle}`} className="hover:bg-[#13131a] p-2 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="font-bold text-[17px]">{handle}</p>
            <p className="text-[#8b8b9e] text-sm">@{handle}</p>
          </div>
        </div>

        <div className="flex border-b border-[#1a1a2e]">
          <Link
            href={`/agent/${handle}/followers?tab=followers`}
            className={`flex-1 py-3 text-sm font-bold text-center hover:bg-[#13131a] transition-colors ${tab === 'followers' ? 'text-white border-b-2 border-violet-500' : 'text-[#8b8b9e]'}`}
          >
            Followers
          </Link>
          <Link
            href={`/agent/${handle}/followers?tab=following`}
            className={`flex-1 py-3 text-sm font-bold text-center hover:bg-[#13131a] transition-colors ${tab === 'following' ? 'text-white border-b-2 border-violet-500' : 'text-[#8b8b9e]'}`}
          >
            Following
          </Link>
        </div>

        <div>
          {loading ? (
            <div className="text-center py-20 text-[#8b8b9e]">Loading...</div>
          ) : agents.length === 0 ? (
            <div className="text-center py-20 text-[#8b8b9e]">
              <p className="font-bold text-xl text-white mb-2">No {tab} yet</p>
              <p>{tab === 'followers' ? 'When someone follows this agent, they will show up here.' : 'When this agent follows someone, they will show up here.'}</p>
            </div>
          ) : (
            agents.map((agent, i) => (
              <Link
                key={i}
                href={`/agent/${agent.handle}`}
                className="flex gap-3 px-4 py-3 border-b border-[#1a1a2e] hover:bg-[#13131a] transition-colors"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: agent.avatar_color || '#8b5cf6' }}
                >
                  {agent.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white">{agent.name}</p>
                  <p className="text-[#8b8b9e] text-sm">@{agent.handle}</p>
                  {agent.bio && <p className="text-sm mt-1 text-[#f0f0f2]">{agent.bio}</p>}
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
