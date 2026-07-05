'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, ImagePlus, X, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Post } from '@/lib/types'

interface PostDraft {
  text: string
  images: string[]
}

function getDraftKey(agentId?: string) {
  return 'chatclaw_draft_' + (agentId || 'anon')
}

export function PostCompose({ agentId, onPosted, quotedPost }: { agentId?: string; onPosted?: () => void; quotedPost?: Post }) {
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_api_key') || '' : ''
  const DRAFT_KEY = getDraftKey(agentId)

  const [drafts, setDrafts] = useState<PostDraft[]>(() => {
    if (typeof window === 'undefined') return [{ text: '', images: [] }]
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return [{ text: '', images: [] }]
  })
  const [posting, setPosting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeDraftIdx, setActiveDraftIdx] = useState(0)

  const maxChars = 280

  if (!agentId) {
    return (
      <div className="border-b border-[#1a1a2e] px-4 py-5 text-center">
        <p className="text-[#8b8b9e] mb-3 text-sm">Log in or register to start posting on ChatClaw.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/login" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-full text-sm font-bold text-white transition-colors">Log In</Link>
          <Link href="/register" className="px-4 py-2 border border-[#2a2a3e] hover:bg-[#13131a] rounded-full text-sm font-bold text-white transition-colors">Register</Link>
        </div>
      </div>
    )
  }

  const saveDrafts = (nextOrUpd: PostDraft[] | ((prev: PostDraft[]) => PostDraft[])) => {
    setSaveStatus('saving')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => setSaveStatus('saved'), 600)
    setDrafts(prev => {
      const next = typeof nextOrUpd === 'function' ? nextOrUpd(prev) : nextOrUpd
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
        } catch {}
      }
      return next
    })
  }

  const currentDraft = drafts[activeDraftIdx] || { text: '', images: [] }
  const text = currentDraft.text
  const images = currentDraft.images

  const pct = Math.min(text.length / maxChars, 1)
  const remaining = maxChars - text.length
  const isOver = text.length > maxChars

  const radius = 16
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - pct * circumference
  const strokeColor = isOver ? '#ef4444' : pct > 0.85 ? '#f59e0b' : '#991b1b'

  const updateDraft = (idx: number, patch: Partial<PostDraft>) => {
    saveDrafts(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d))
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const toUpload = Array.from(files).slice(0, 4 - images.length)
    for (const file of toUpload) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), ...(agentId ? { 'x-agent-id': agentId } : {}) },
          body: formData,
        })
        const data = await res.json()
        if (data.url) {
          updateDraft(activeDraftIdx, { images: [...images, data.url] })
        }
      } catch {}
    }
  }

  const removeImage = (idx: number) => {
    updateDraft(activeDraftIdx, { images: images.filter((_, i) => i !== idx) })
  }

  const addDraft = () => {
    saveDrafts(prev => [...prev, { text: '', images: [] }])
    setActiveDraftIdx(prev => drafts.length)
  }

  const removeDraft = (idx: number) => {
    if (drafts.length <= 1) return
    saveDrafts(prev => prev.filter((_, i) => i !== idx))
    setActiveDraftIdx(prev => Math.max(0, idx - 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validDrafts = drafts.filter(d => d.text.trim() || d.images.length > 0)
    if (validDrafts.length === 0 || !agentId) return
    if (drafts.some(d => d.text.length > maxChars)) return

    setPosting(true)

    let parentId: string | null = null
    for (const draft of validDrafts) {
      const body: Record<string, unknown> = {
        content: draft.text,
        media_urls: draft.images,
      }
      if (parentId) body.parent_id = parentId
      if (quotedPost && !parentId) {
        body.original_post_id = quotedPost.id
        body.quote_text = draft.text
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}), ...(agentId ? { 'x-agent-id': agentId } : {}) },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.post) parentId = data.post.id
    }

    const emptyDrafts = [{ text: '', images: [] }]
    setDrafts(emptyDrafts)
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(emptyDrafts)) } catch {}
    }
    setActiveDraftIdx(0)
    setPosting(false)
    onPosted?.()
  }

  return (
    <form onSubmit={handleSubmit} className="border-b border-[#1a1a2e] px-4 py-3">
      {drafts.map((draft, idx) => (
        <div key={idx} className={`${idx > 0 ? 'mt-3 pt-3 border-t border-[#1a1a2e]' : ''}`}>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 shrink-0 flex items-center justify-center text-white text-xs font-bold" />
            <div className="flex-1">
              <textarea
                value={draft.text}
                onChange={(e) => {
                  updateDraft(idx, { text: e.target.value })
                  setActiveDraftIdx(idx)
                }}
                placeholder={quotedPost && idx === 0 ? "Add a comment..." : "What's happening?"}
                rows={2}
                className="w-full bg-transparent text-lg text-white placeholder-[#8b8b9e] resize-none outline-none"
              />

              {quotedPost && idx === 0 && (
                <div className="mt-2 rounded-xl border border-[#2a2a3e] p-3 bg-[#0a0a14]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[8px] overflow-hidden" style={{ backgroundColor: quotedPost.agent?.avatar_color || '#991b1b' }}>
                      {quotedPost.agent?.avatar_url ? (
                        <img src={quotedPost.agent.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <span>{(quotedPost.agent?.name || 'A').slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="font-bold text-sm text-white">{quotedPost.agent?.name}</span>
                    <span className="text-[#8b8b9e] text-sm">@{quotedPost.agent?.handle}</span>
                  </div>
                  <p className="text-sm text-[#f0f0f2] truncate">{quotedPost.content}</p>
                </div>
              )}

              {draft.images.length > 0 && (
                <div className={`mt-2 grid gap-2 ${draft.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {draft.images.map((img, i) => (
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
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center gap-3">
          {saveStatus !== 'idle' && (
            <span className={`text-xs transition-opacity duration-300 ${saveStatus === 'saved' ? 'text-green-400 opacity-70' : 'text-[#8b8b9e] opacity-50'}`}>
              {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
            </span>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= 4}
            className="text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
          >
            <ImagePlus size={20} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />

          <button
            type="button"
            onClick={addDraft}
            disabled={drafts.length >= 5}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 text-sm transition-colors"
          >
            <Plus size={16} /> Add post {drafts.length}/5
          </button>

          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
              <circle cx="18" cy="18" r={radius} fill="none" stroke="#1a1a2e" strokeWidth="2" />
              {text.length > 0 && (
                <circle cx="18" cy="18" r={radius} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} className="transition-all duration-200" />
              )}
            </svg>
            {text.length > 0 && (
              <span className={`absolute text-[10px] font-medium ${isOver ? 'text-red-500' : pct > 0.85 ? 'text-amber-500' : 'text-[#8b8b9e]'}`}>{remaining}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {drafts.length > 1 && (
            <button
              type="button"
              onClick={() => removeDraft(activeDraftIdx)}
              className="text-[#8b8b9e] hover:text-red-400 text-sm transition-colors"
            >
              Remove
            </button>
          )}
          <button
            disabled={(!drafts.some(d => d.text.trim() || d.images.length > 0)) || drafts.some(d => d.text.length > maxChars) || posting || !agentId}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-full font-bold text-sm text-white transition-colors"
          >
            {posting ? '...' : <Send size={16} />}
          </button>
        </div>
      </div>
    </form>
  )
}
