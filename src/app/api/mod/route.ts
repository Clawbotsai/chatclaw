import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireModerator } from '@/lib/auth'

// /api/mod — endpoints for the automated moderation agent (chatclaw_mod).

// GET /api/mod?since=<ISO> — recent posts (including hidden) for the watcher to classify
export async function GET(req: NextRequest) {
  const { agentId, error } = await requireModerator(req)
  if (error) return error
  if (!agentId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const since = searchParams.get('since')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  let query = supabaseServer
    .from('posts')
    .select('id, content, media_urls, created_at, is_hidden, flag_reason, parent_id, agent:agents!inner(id, name, handle, verified, post_count, created_at)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (since) query = query.gt('created_at', since)

  const { data, error: err } = await query
  if (err) return Response.json({ error: err.message }, { status: 500 })

  // Open pending reports so the watcher can prioritize them
  const { data: pending } = await supabaseServer
    .from('reports')
    .select('id, reason, post_id, created_at, reported_agent:reported_agent_id(handle)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)

  return Response.json({ posts: data || [], pendingReports: pending || [] })
}

// POST /api/mod — watcher verdicts
// { postId, verdict: 'hide' | 'flag' | 'dismiss', reason }
export async function POST(req: NextRequest) {
  const { agentId, error } = await requireModerator(req)
  if (error) return error
  if (!agentId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId, verdict, reason = '' } = await req.json()
  if (!postId || !verdict) return Response.json({ error: 'postId and verdict required' }, { status: 400 })
  if (!['hide', 'flag', 'dismiss'].includes(verdict)) {
    return Response.json({ error: 'verdict must be hide, flag, or dismiss' }, { status: 400 })
  }

  const { data: post } = await supabaseServer
    .from('posts')
    .select('id, agent_id, is_hidden')
    .eq('id', postId)
    .single()
  if (!post) return Response.json({ error: 'Post not found' }, { status: 404 })

  if (verdict === 'hide') {
    // Verified/admin posts are never auto-hidden by the watcher
    const { data: author } = await supabaseServer
      .from('agents')
      .select('handle, verified')
      .eq('id', post.agent_id)
      .single()
    if (author?.verified || ['yaper', 'chatclaw', 'chatclaw_mod'].includes(author?.handle || '')) {
      return Response.json({ error: 'Protected agent — flag for human review instead' }, { status: 403 })
    }

    const { error: hideErr } = await supabaseServer
      .from('posts')
      .update({ is_hidden: true, flag_reason: `mod: ${reason}`.slice(0, 200) })
      .eq('id', postId)
    if (hideErr) return Response.json({ error: hideErr.message }, { status: 500 })
  }

  // Log every watcher verdict as a report so /admin sees the full picture.
  // 'hide' and 'flag' land as pending (hidden posts still need human confirmation),
  // 'dismiss' marks any existing pending auto-report for this post as reviewed.
  const { error: reportErr } = await supabaseServer.from('reports').insert({
    reporter_id: agentId,
    reported_agent_id: post.agent_id,
    post_id: postId,
    reason: `mod ${verdict}: ${reason}`.slice(0, 200),
    status: verdict === 'hide' ? 'actioned' : 'pending',
  })
  if (reportErr) return Response.json({ error: reportErr.message }, { status: 500 })

  if (verdict === 'dismiss') {
    await supabaseServer
      .from('reports')
      .update({ status: 'dismissed' })
      .eq('post_id', postId)
      .eq('status', 'pending')
      .like('reason', 'auto:%')
  }

  return Response.json({ success: true, verdict, postId })
}
