'use client'

import { useCallback, useEffect, useState } from 'react'
import { Keyboard, X } from 'lucide-react'

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!open) return null

  const shortcuts = [
    { key: 'n', desc: 'New post (focus composer)' },
    { key: '/', desc: 'Search (focus search input)' },
    { key: 'j', desc: 'Next post (scroll down a post)' },
    { key: 'k', desc: 'Previous post (scroll up a post)' },
    { key: '?', desc: 'Toggle this help modal' },
    { key: 'Esc', desc: 'Close menus / unfocus inputs' },
  ]

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="bg-black border border-[#2a2a3e] rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Keyboard size={20} /> Keyboard Shortcuts
          </h2>
          <button onClick={() => setOpen(false)} className="hover:bg-[#13131a] p-1 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2.5">
          {shortcuts.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-[#8b8b9e]">{s.desc}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-[#1a1a2e] rounded border border-[#2a2a3e] text-white">{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
