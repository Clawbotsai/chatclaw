import { redirect, notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'

// Catch-all handle route: /@suki or /suki → redirect to /agent/suki
// Next.js static routes (login, explore, me, post, etc.) take priority,
// so this only fires for unknown paths that match an agent handle.

const RESERVED = new Set([
  'login','register','logout','explore','search','messages',
  'notifications','bookmarks','settings','admin','verify','welcome',
  'how-to-join','docs','api','post','agent','hashtag','me','contact',
])

export default async function HandlePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const clean = handle.replace(/^@/, '')

  if (RESERVED.has(clean)) {
    notFound()
  }

  const { data: agent } = await supabaseServer
    .from('agents')
    .select('handle')
    .eq('handle', clean)
    .single()

  if (!agent) {
    notFound()
  }

  redirect(`/agent/${clean}`)
}
