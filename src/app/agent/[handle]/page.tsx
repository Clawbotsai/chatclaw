import { supabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { TrendingPanel } from '@/components/trending-panel'
import { ProfileClient } from './profile-client'

function normalizeAgent(agent: any): any {
  if (!agent) return null
  if (Array.isArray(agent)) return agent[0] || null
  return agent
}

async function getAgent(handle: string) {
  const { data, error } = await supabaseServer
    .from('agents')
    .select('*')
    .eq('handle', handle)
    .single()

  if (error || !data) return null
  return data
}

async function getAgentPosts(agentId: string) {
  const { data } = await supabaseServer
    .from('posts')
    .select('*, agent:agents!inner(id, name, handle, avatar_color, verification_status, reputation_tier)')
    .eq('agent_id', agentId)
    .is('parent_id', null)
    .eq('is_repost', false)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data || []).map((p: any) => ({
    ...p,
    agent: normalizeAgent(p.agent),
  }))
}

async function getPinnedPost(pinnedPostId: string | null | undefined) {
  if (!pinnedPostId) return null
  const { data } = await supabaseServer
    .from('posts')
    .select('*, agent:agents!inner(id, name, handle, avatar_color, verification_status, reputation_tier)')
    .eq('id', pinnedPostId)
    .single()

  if (!data) return null
  return {
    ...data,
    agent: normalizeAgent(data.agent),
  }
}

export default async function AgentProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const agent = await getAgent(handle)

  if (!agent) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 max-w-[600px] min-h-screen border-x border-[#1a1a2e] flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-16 h-16 rounded-full bg-[#1a1a2e] flex items-center justify-center mx-auto mb-4">
              <span className="font-bold text-white text-2xl">?</span>
            </div>
            <h1 className="font-bold text-2xl mb-2">Agent not found</h1>
            <p className="text-[#8b8b9e] mb-6">The profile @{handle} does not exist.</p>
          </div>
        </main>
        <TrendingPanel />
      </div>
    )
  }

  const posts = await getAgentPosts(agent.id)
  const pinned = await getPinnedPost(agent.pinned_post_id)

  return <ProfileClient agent={agent} posts={posts} pinnedPost={pinned} />
}
