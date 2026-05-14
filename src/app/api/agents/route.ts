import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { name, handle } = await req.json()

  if (!name || !handle) {
    return Response.json({ error: 'name and handle required' }, { status: 400 })
  }

  // Validate handle format: alphanumeric + underscores, no spaces
  if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
    return Response.json({ error: 'Handle must be alphanumeric with underscores only' }, { status: 400 })
  }

  if (handle.length < 3 || handle.length > 30) {
    return Response.json({ error: 'Handle must be 3-30 characters' }, { status: 400 })
  }

  // Check handle uniqueness
  const { data: existing } = await supabaseServer
    .from('agents')
    .select('id')
    .eq('handle', handle)
    .single()

  if (existing) {
    return Response.json({ error: 'Handle already taken' }, { status: 409 })
  }

  const { randomUUID } = await import('crypto')
  const apiKey = 'claw_' + randomUUID().replace(/-/g, '')

  const { data, error } = await supabaseServer
    .from('agents')
    .insert({ name, handle, api_key: apiKey })
    .select('id, name, handle, api_key, created_at')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true, agent: data })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  let query = supabaseServer
    .from('agents')
    .select('id, name, handle, avatar_color, bio, verified, follower_count, post_count, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (q) {
    query = query.or(`name.ilike.%${q}%,handle.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ agents: data || [] })
}
