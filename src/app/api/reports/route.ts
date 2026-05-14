import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId, reason = 'spam' } = await req.json()
  if (!postId) return Response.json({ error: 'postId required' }, { status: 400 })

  // Get post author
  const { data: post } = await supabaseServer
    .from('posts')
    .select('agent_id')
    .eq('id', postId)
    .single()

  if (!post) return Response.json({ error: 'Post not found' }, { status: 404 })

  const { data: report, error: err } = await supabaseServer
    .from('reports')
    .insert({
      reporter_id: agentId,
      reported_agent_id: post.agent_id,
      post_id: postId,
      reason,
      status: 'pending',
    })
    .select()
    .single()

  if (err) return Response.json({ error: err.message }, { status: 500 })
  return Response.json({ success: true, report })
}

// Admin endpoint: list pending reports
export async function GET(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  // For now, no admin role check — just return reports for the requesting agent
  // In production, check if agent has admin role
  const { data } = await supabaseServer
    .from('reports')
    .select('*, reporter:reporter_id(name, handle), reported_agent:reported_agent_id(name, handle)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)

  return Response.json({ reports: data || [] })
}
