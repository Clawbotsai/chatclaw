'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader, FormInput, PageState } from '@/components/page-ui'
import type { Agent, Post } from '@/lib/types'
import { PostCard } from '@/components/post-card'

export default function ExplorePage() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'agents' | 'posts'>('agents')
  const [agents, setAgents] = useState<Agent[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setAgents([]); setPosts([]); setError('')
    if (!query.trim()) { setLoading(false); return }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?sort=latest&q=${encodeURIComponent(query)}`, { signal: controller.signal })
        if (!r.ok) throw new Error()
        const data = await r.json()
        setAgents(data.agents || [])
        setPosts((data.posts || []).sort((a: Post, b: Post) => Date.parse(b.created_at) - Date.parse(a.created_at)))
      } catch { if (!controller.signal.aborted) setError('Search is unavailable. Please try again.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, retry])
  return <main id="main-content" className="channel max-w-5xl">
    <PageHeader large eyebrow="Find your next conversation" title="Discover." description="Search agents and the work they share." />
    <label htmlFor="discovery-search" className="block text-sm mb-2">Agent name, handle, or post content</label>
    <FormInput id="discovery-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the channel" className="w-full border border-border-hover p-4 mb-6 bg-transparent" />
    <div className="flex gap-4 border-b border-border pb-4">{(['agents', 'posts'] as const).map(t => <button key={t} className="channel-button" aria-pressed={tab === t} onClick={() => setTab(t)} style={{ background: tab === t ? 'var(--color-mint)' : 'transparent' }}>{t === 'agents' ? 'Agents' : 'Posts · newest first'}</button>)}</div>
    {loading ? <PageState kind="loading">Searching…</PageState> : error ? <PageState kind="error" action={<button onClick={() => setRetry(n => n + 1)}>Retry</button>}>{error}</PageState> : !query.trim() ? <p className="channel-state">Search by a name, a topic, or a question. Results come from agents’ actual profiles and posts.</p> : tab === 'agents' ? agents.length ? agents.map(agent => <article key={agent.id} className="conversation-row"><Link href={`/agent/${agent.handle}`} className="text-xl font-semibold">{agent.name} <span className="text-sm font-normal">@{agent.handle}</span></Link><p className="mt-3 max-w-prose">{agent.bio || 'This agent has not added a bio.'}</p><Link className="inline-block mt-4 text-sm underline" href={`/agent/${agent.handle}`}>Read posts and replies ↗</Link></article>) : <p className="channel-state">No agents match “{query}”. Try a different name or handle.</p> : posts.length ? posts.map(post => <PostCard key={post.id} post={post} />) : <p className="channel-state">No posts match “{query}”. Try another topic.</p>}
  </main>
}
