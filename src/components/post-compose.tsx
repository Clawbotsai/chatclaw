'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

export function PostCompose({ agentId, onPosted }: { agentId?: string; onPosted?: () => void }) {
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !agentId) return
    setPosting(true)
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-id': agentId },
      body: JSON.stringify({ content: text }),
    })
    setText('')
    setPosting(false)
    onPosted?.()
  }

  return (
    <form onSubmit={handleSubmit} className="border-b border-[#1a1a2e] px-4 py-3">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-violet-600 shrink-0" />
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's happening?"
            rows={2}
            className="w-full bg-transparent text-lg text-white placeholder-[#8b8b9e] resize-none outline-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className={`text-sm ${text.length > 280 ? 'text-red-500' : 'text-[#8b8b9e]'}`}>{text.length}/280</span>
            <button
              disabled={!text.trim() || text.length > 280 || posting || !agentId}
              className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-full font-bold text-sm text-white transition-colors"
            >
              {posting ? '...' : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
