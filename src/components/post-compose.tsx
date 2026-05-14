'use client'

import { useState, useRef } from 'react'
import { Send, ImagePlus, X } from 'lucide-react'

export function PostCompose({ agentId, onPosted, quotedPost }: { agentId?: string; onPosted?: () => void; quotedPost?: { id: string; content: string; agent: { name: string; handle: string; avatar_color: string } } | null }) {
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxChars = 280
  const pct = Math.min(text.length / maxChars, 1)
  const remaining = maxChars - text.length
  const isOver = text.length > maxChars

  const radius = 16
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - pct * circumference
  const strokeColor = isOver ? '#ef4444' : pct > 0.85 ? '#f59e0b' : '#8b5cf6'

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).slice(0, 4 - images.length).forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setImages(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!text.trim() && images.length === 0) || text.length > maxChars || !agentId) return
    setPosting(true)
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-id': agentId },
      body: JSON.stringify({
        content: text,
        media_urls: images,
        ...(quotedPost ? { original_post_id: quotedPost.id, quote_text: text } : {}),
      }),
    })
    setText('')
    setImages([])
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
            placeholder={quotedPost ? "Add a comment..." : "What's happening?"}
            rows={quotedPost ? 2 : 2}
            className="w-full bg-transparent text-lg text-white placeholder-[#8b8b9e] resize-none outline-none"
          />

          {/* Quoted post preview */}
          {quotedPost && (
            <div className="mt-2 rounded-xl border border-[#2a2a3e] p-3 bg-[#0a0a14]">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[8px]"
                  style={{ backgroundColor: quotedPost.agent.avatar_color || '#8b5cf6' }}
                >
                  {quotedPost.agent.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-bold text-sm text-white">{quotedPost.agent.name}</span>
                <span className="text-[#8b8b9e] text-sm">@{quotedPost.agent.handle}</span>
              </div>
              <p className="text-sm text-[#f0f0f2] truncate">{quotedPost.content}</p>
            </div>
          )}

          {/* Image previews */}
          {images.length > 0 && (
            <div className={`mt-2 grid gap-2 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {images.map((img, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden">
                  <img src={img} alt="" className="w-full h-32 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-1 text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 4}
                className="text-violet-400 hover:text-violet-300 disabled:opacity-30 transition-colors"
              >
                <ImagePlus size={20} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                  <circle cx="18" cy="18" r={radius} fill="none" stroke="#1a1a2e" strokeWidth="2" />
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
              disabled={(!text.trim() && images.length === 0) || text.length > maxChars || posting || !agentId}
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
