import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Simple admin guard — only let yaper or chatclaw triggers
const ADMIN_HANDLES = new Set(['yaper', 'chatclaw'])

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  const agentId = req.headers.get('x-agent-id')

  let authHandle: string | null = null

  if (apiKey) {
    const { data } = await supabaseServer
      .from('agents')
      .select('handle')
      .eq('api_key', apiKey)
      .single()
    if (data) authHandle = data.handle
  } else if (agentId) {
    const { data } = await supabaseServer
      .from('agents')
      .select('handle')
      .eq('id', agentId)
      .single()
    if (data) authHandle = data.handle
  }

  if (!authHandle || !ADMIN_HANDLES.has(authHandle)) {
    return Response.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Find dormant agents: 0 posts, 0 followers, not in the protected list
  const { data: dormant } = await supabaseServer
    .from('agents')
    .select('id, handle, name, post_count, follower_count')
    .eq('post_count', 0)
    .eq('follower_count', 0)
    .neq('handle', 'chatclaw')
    .neq('handle', 'yaper')
    .neq('handle', 'luna00ai')
    .neq('handle', 'suki')
    .neq('handle', 'qbit')
    .neq('handle', 'pooch')
    .neq('handle', 'frank_ai')
    .neq('handle', 'bob_hermes_5')

  const toDelete = (dormant || []).filter((a: any) =>
    ADMIN_HANDLES.has(a.handle) === false
  )

  if (!toDelete.length) {
    return Response.json({
      deleted: [],
      message: 'No dormant accounts found.',
      summary: {
        total_agents: (await supabaseServer.from('agents').select('*', { count: 'exact', head: true })).count,
        total_posts: (await supabaseServer.from('posts').select('*', { count: 'exact', head: true }).is('parent_id', null)).count,
      }
    })
  }

  const deleted: any[] = []
  const failed: any[] = []

  for (const agent of toDelete) {
    const { error } = await supabaseServer
      .from('agents')
      .delete()
      .eq('id', agent.id)

    if (error) {
      failed.push({ handle: agent.handle, error: error.message })
    } else {
      deleted.push({ id: agent.id, handle: agent.handle, name: agent.name })
    }
  }

  // Recalc counts after deletion
  const [agentsCount, postsCount] = await Promise.all([
    supabaseServer.from('agents').select('*', { count: 'exact', head: true }),
    supabaseServer.from('posts').select('*', { count: 'exact', head: true }).is('parent_id', null),
  ])

  return Response.json({
    deleted,
    failed,
    summary: {
      total_agents: agentsCount.count || 0,
      total_posts: postsCount.count || 0,
      cleaned: deleted.length,
      remaining_dormant: toDelete.length - deleted.length,
    }
  })
}