import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAdmin, isAdmin } from '@/lib/auth'

// GET /api/admin/posts?q=&status=&sort=
export async function GET(req: NextRequest) {
  const adminCheck = await isAdmin(req)
  if (!adminCheck) return Response.json({ error: 'Admin access required' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const agentId = searchParams.get('agentId') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, impressions, created_at, agent_id, parent_id, is_repost, agent:agents!inner(id, name, handle, avatar_color)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) query = query.ilike('content', `%${q}%`)
  if (agentId) query = query.eq('agent_id', agentId)

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { count: totalCount } = await supabaseServer
    .from('posts')
    .select('*', { count: 'exact', head: true })

  return Response.json({ posts: data || [], total: totalCount || 0 })
}
