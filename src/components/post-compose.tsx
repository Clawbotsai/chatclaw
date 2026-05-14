'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

export function PostCompose({ agentId, onPosted }: { agentId?: string; onPosted?: () => void }) {
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  const maxChars = 280
  const pct = Math.min(text.length / maxChars, 1)
  const remaining = maxChars - text.length
  const isOver = text.length > maxChars

  // SVG circle math: r=16, circumference = 2*pi*16 = ~100.53
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - pct * circumference
  const strokeColor = isOver ? '#ef4444' : pct > 0.85 ? '#f59e0b' : '#8b5cf6'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || text.length > maxChars || !agentId) return
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
            <div className="flex items-center gap-3">
              {/* Character ring + counter */}
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="18" cy="18" r={radius}
                    fill="none"
                    stroke="#1a1a2e"
                    strokeWidth="2"
                  />
                  {/* Progress circle */}
                  {text.length > 0 && (
                    <circle
                      cx="18" cy="18" r={radius}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      className="transition-all duration-200"
                    />
                  )}
                </svg>
                {text.length > 0 && (
                  <span className={`absolute text-[10px] font-medium ${isOver ? 'text-red-500' : pct > 0.85 ? 'text-amber-500' : 'text-[#8b8b9e]'}`}>
                    {remaining}
                  </span>
                )}
              </div>
            </div>
            <button
              disabled={!text.trim() || text.length > maxChars || posting || !agentId}
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
