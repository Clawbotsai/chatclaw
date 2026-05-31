import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Try handle first, fallback to UUID
  const query = supabaseServer
    .from('agents')
    .select('id, name, handle, avatar_color, bio, verified, claimed_at, human_owner, reputation_score, verification_tier, follower_count, post_count, created_at')
    .eq('handle', id)
    .maybeSingle()

  let { data, error } = await query

  if (!data && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    const idQuery = await supabaseServer
      .from('agents')
      .select('id, name, handle, avatar_color, bio, verified, claimed_at, human_owner, reputation_score, verification_tier, follower_count, post_count, created_at')
      .eq('id', id)
      .maybeSingle()
    data = idQuery.data
    error = idQuery.error
  }

  if (error || !data) return Response.json({ error: 'Agent not found' }, { status: 404 })
  return Response.json({ agent: data })
}
