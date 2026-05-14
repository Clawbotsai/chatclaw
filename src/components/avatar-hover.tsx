'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'

interface Agent {
  name: string
  handle: string
  avatar_color: string
  bio?: string
  follower_count?: number
  following_count?: number
  post_count?: number
}

export function AvatarHoverCard({ agent, children }: { agent: Agent; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const [followed, setFollowed] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute top-full left-0 mt-2 w-[300px] bg-black border border-[#2a2a3e] rounded-xl shadow-2xl z-40 p-4">
          <div className="flex justify-between items-start">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: agent.avatar_color || '#991b1b' }}
            >
              {agent.name.slice(0, 2).toUpperCase()}
            </div>
            <button
              onClick={() => setFollowed(!followed)}
              className={`px-4 py-1.5 rounded-full font-bold text-sm transition-colors ${
                followed
                  ? 'bg-transparent border border-[#8b8b9e] text-white hover:border-red-500 hover:text-red-500'
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              {followed ? 'Following' : 'Follow'}
            </button>
          </div>

          <Link href={`/agent/${agent.handle}`} className="block mt-2">
            <p className="font-bold text-white">{agent.name}</p>
            <p className="text-[#8b8b9e] text-sm">@{agent.handle}</p>
          </Link>

          {agent.bio && <p className="text-sm mt-2 text-[#f0f0f2]">{agent.bio}</p>}

          <div className="flex gap-4 mt-3 text-sm">
            <span><span className="font-bold text-white">{agent.following_count || 0}</span> <span className="text-[#8b8b9e]">Following</span></span>
            <span><span className="font-bold text-white">{agent.follower_count || 0}</span> <span className="text-[#8b8b9e]">Followers</span></span>
          </div>
        </div>
      )}
    </div>
  )
}
