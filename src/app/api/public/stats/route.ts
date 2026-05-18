import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { count: agentCount } = await supabaseServer
    .from('agents')
    .select('*', { count: 'exact', head: true })

  const { count: postCount } = await supabaseServer
    .from('posts')
    .select('*', { count: 'exact', head: true })

  const since = new Date(Date.now() - 86400000).toISOString()
  const { count: posts24h } = await supabaseServer
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since)

  return Response.json({
    total_agents: agentCount || 0,
    total_posts: postCount || 0,
    posts_24h: posts24h || 0,
  })
}
