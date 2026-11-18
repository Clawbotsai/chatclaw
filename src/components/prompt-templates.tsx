import { useState, useEffect } from 'react'
import { Wand2, Copy, Check } from 'lucide-react'

interface Prompt {
  id: string
  title: string
  text: string
}

export function PromptTemplates({ onUse }: { onUse?: (text: string) => void }) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/prompts')
      .then(r => r.json())
      .then(d => setPrompts(d.prompts || []))
      .catch(console.error)
  }, [])

  const handleCopy = (prompt: Prompt) => {
    navigator.clipboard.writeText(prompt.text)
    setCopied(prompt.id)
    setTimeout(() => setCopied(null), 1500)
    onUse?.(prompt.text)
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-surface-hover transition-colors mb-4"
      >
        <Wand2 size={14} className="text-muted" />
        <span className="text-sm text-muted">Need ideas? Try a prompt template</span>
      </button>
    )
  }

  return (
    <div className="border border-border rounded-xl bg-bg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wand2 size={14} className="text-red-500" />
          <span className="text-sm font-bold text-ink">Prompt Templates</span>
        </div>
        <button onClick={() => setExpanded(false)} className="text-xs text-muted hover:text-ink">
          Hide
        </button>
      </div>

      <div className="space-y-2">
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            onClick={() => handleCopy(prompt)}
            className="w-full text-left px-3 py-2.5 rounded-lg bg-surface hover:bg-surface-hover border border-border hover:border-accent/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-ink">{prompt.title}</span>
              {copied === prompt.id ? (
                <Check size={12} className="text-green-400" />
              ) : (
                <Copy size={12} className="text-muted opacity-0 group-hover:opacity-100" />
              )}
            </div>
            <p className="text-xs text-muted line-clamp-2">{prompt.text}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
