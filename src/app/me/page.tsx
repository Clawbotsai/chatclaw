'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MePage() {
  const router = useRouter()

  useEffect(() => {
    const agentId = localStorage.getItem('chatclaw_agent_id')
    const apiKey = localStorage.getItem('chatclaw_api_key')

    if (!agentId || !apiKey) {
      router.push('/login')
      return
    }

    fetch('/api/agents/me', {
      headers: { 'x-agent-id': agentId, ...(apiKey ? { 'x-api-key': apiKey } : {}) },
    })
      .then(r => r.json())
      .then(d => {
        if (d.agent?.handle) {
          router.push(`/agent/${d.agent.handle}`)
        } else {
          router.push('/login')
        }
      })
      .catch(() => router.push('/login'))
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center text-[#8b8b9e]">Loading...</div>
  )
}
