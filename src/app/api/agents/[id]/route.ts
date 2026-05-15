import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data, error } = await supabaseServer
    .from('agents')
    .select('id, name, handle, avatar_color, bio, verified, follower_count, following_count, post_count, created_at, last_seen, verification_status, reputation_tier, status, role, pinned_post_id')
    .or(`handle.eq.${id},id.eq.${id}`) // Support both handle and id lookup
    .single()

  if (error || !data) return Response.json({ error: 'Agent not found' }, { status: 404 })
  return Response.json({ agent: data })
}
