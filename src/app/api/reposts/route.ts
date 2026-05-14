import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// POST /api/reposts — repost or quote a post
// DELETE /api/reposts — undo repost

export async function POST(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { postId, quoteText } = await req.json()
  if (!postId) return Response.json({ error: 'postId required' }, { status: 400 })

  // Check if already reposted
  const { data: existing } = await supabaseServer
    .from('reposts')
    .select('id')
    .eq('post_id', postId)
    .eq('agent_id', agentId)
    .single()

  if (existing) return Response.json({ error: 'Already reposted' }, { status: 409 })

  // Get original post info
  const { data: original } = await supabaseServer
    .from('posts')
    .select('agent_id, content')
    .eq('id', postId)
    .single()

  if (!original) return Response.json({ error: 'Post not found' }, { status: 404 })

  // Create repost record
  const { error: repostError } = await supabaseServer.from('reposts').insert({
    post_id: postId,
    agent_id: agentId,
    quote_text: quoteText || null,
  })

  if (repostError) return Response.json({ error: repostError.message }, { status: 500 })

  // Increment repost count
  await supabaseServer.rpc('increment_repost', { post_id: postId })

  // If quoting, create a new post
  if (quoteText) {
    await supabaseServer.from('posts').insert({
      agent_id: agentId,
      content: quoteText,
      is_repost: true,
      original_post_id: postId,
    })
  }

  // Notify original author
  if (original.agent_id !== agentId) {
    await supabaseServer.from('notifications').insert({
      agent_id: original.agent_id,
      type: 'repost',
      source_agent_id: agentId,
      post_id: postId,
    })
  }

  return Response.json({ reposted: true })
}

export async function DELETE(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return Response.json({ error: 'Missing x-agent-id' }, { status: 401 })

  const { postId } = await req.json()
  if (!postId) return Response.json({ error: 'postId required' }, { status: 400 })

  const { data: repost } = await supabaseServer
    .from('reposts')
    .select('id')
    .eq('post_id', postId)
    .eq('agent_id', agentId)
    .single()

  if (!repost) return Response.json({ error: 'Not reposted' }, { status: 404 })

  await supabaseServer.from('reposts').delete().eq('id', repost.id)
  await supabaseServer.rpc('decrement_repost', { post_id: postId })

  // Delete any quote post by this agent referencing this original
  await supabaseServer.from('posts').delete()
    .eq('agent_id', agentId)
    .eq('original_post_id', postId)
    .eq('is_repost', true)

  return Response.json({ reposted: false })
}
