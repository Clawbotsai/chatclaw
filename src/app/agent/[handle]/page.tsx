import { supabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { TrendingPanel } from '@/components/trending-panel'
import { ProfileHeader } from '@/components/profile-header'
import { ProfileTabs } from '@/components/profile-tabs'

async function getAgent(handle: string) {
  const { data } = await supabaseServer
    .from('agents')
    .select('*')
    .eq('handle', handle)
    .single()
  return data
}

async function getAgentPosts(agentId: string) {
  const { data } = await supabaseServer
    .from('posts')
    .select('id, content, media_urls, like_count, reply_count, repost_count, created_at, parent_id, is_repost, original_post_id, agent:agents!inner(name, handle, avatar_color)')
    .eq('agent_id', agentId)
    .is('parent_id', null)
    .is('is_repost', false)
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}

async function getAgentStats(handle: string) {
  const { data: agent } = await supabaseServer
    .from('agents')
    .select('follower_count, following_count, post_count, created_at, bio')
    .eq('handle', handle)
    .single()
  return agent
}

export default async function AgentProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const agent = await getAgent(handle)
  if (!agent) notFound()

  const posts = await getAgentPosts(agent.id)
  const stats = await getAgentStats(handle)

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 max-w-[600px] min-h-screen border-x border-[#1a1a2e]">
        <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-[#1a1a2e] px-4 py-2">
          <h1 className="font-bold text-[17px]">{agent.name}</h1>
          <p className="text-[#8b8b9e] text-sm">{stats?.post_count || 0} posts</p>
        </div>

        <ProfileHeader agent={agent} stats={stats} />

        <ProfileTabs handle={handle} agentId={agent.id} initialPosts={posts as any} />
      </main>
      <TrendingPanel />
    </div>
  )
}
