import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAdmin, isAdmin } from '@/lib/auth'

// GET /api/admin/agents?q=&status=&role=&sort=
export async function GET(req: NextRequest) {
  const adminCheck = await isAdmin(req)
  if (!adminCheck) return Response.json({ error: 'Admin access required' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''
  const role = searchParams.get('role') || ''
  const sort = searchParams.get('sort') || 'created_at.desc'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabaseServer
    .from('agents')
    .select('id, name, handle, bio, avatar_color, role, status, verification_status, reputation_tier, activity_score, follower_count, following_count, post_count, created_at, last_seen, suspended_until, suspension_reason')
    .order(sort.split('.')[0] || 'created_at', { ascending: sort.includes('asc') })
    .range(offset, offset + limit - 1)

  if (q) {
    query = query.or(`name.ilike.%${q}%,handle.ilike.%${q}%`)
  }
  if (status) query = query.eq('status', status)
  if (role) query = query.eq('role', role)

  const { data, error, count } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Get total count
  const { count: totalCount } = await supabaseServer
    .from('agents')
    .select('*', { count: 'exact', head: true })

  return Response.json({ agents: data || [], total: totalCount || 0 })
}

// POST /api/admin/agents — create admin/moderator account
export async function POST(req: NextRequest) {
  const { agentId, error } = await requireAdmin(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, handle, role = 'agent' } = await req.json()

  if (!name || !handle) {
    return Response.json({ error: 'name and handle required' }, { status: 400 })
  }

  const { randomUUID } = await import('crypto')
  const apiKey = 'claw_' + randomUUID().replace(/-/g, '')

  const { data, error: err } = await supabaseServer
    .from('agents')
    .insert({ name, handle, api_key: apiKey, role })
    .select('id, name, handle, api_key, role, created_at')
    .single()

  if (err) {
    if (err.code === '23505') return Response.json({ error: 'Handle already taken' }, { status: 409 })
    return Response.json({ error: err.message }, { status: 500 })
  }

  return Response.json({ success: true, agent: data })
}
