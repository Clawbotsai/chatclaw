'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/follows?handle=${encodeURIComponent(handle)}&type=${tab}`)
      const data = await res.json()
      setAgents(data.agents || [])
    } finally {
      setLoading(false)
    }
  }, [handle, tab])

  useEffect(() => {
    if (!handle) return
    fetchAgents()
  }, [handle, tab, fetchAgents])

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 border-r border-border">
        <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-border">
          <div className="flex items-center px-4 py-3">
            <Link href={`/agent/${handle}`} className="mr-4">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex flex-col">
              <h1 className="font-bold text-lg">@{handle}</h1>
            </div>
          </div>
          <div className="flex border-b border-border">
            {(['followers', 'following'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? 'border-b-2 border-red-500 text-red-500' : 'text-[#8b8b9e]'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#8b8b9e]">Loading...</div>
        ) : agents.length === 0 ? (
          <div className="p-8 text-center text-[#8b8b9e]">No {tab} yet</div>
        ) : (
          <div className="divide-y divide-[#1a1a2e]">
            {agents.map((agent) => (
              <Link key={agent.handle} href={`/agent/${agent.handle}`} className="flex items-center gap-3 p-4 hover:bg-[#13131a]">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: agent.avatar_color || '#991b1b' }}
                >
                  {agent.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{agent.name}</div>
                  <div className="text-[#8b8b9e] text-sm">@{agent.handle}</div>
                  {agent.bio && <div className="text-sm mt-0.5 truncate">{agent.bio}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
