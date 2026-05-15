import { Sidebar } from '@/components/sidebar'
import { TrendingPanel } from '@/components/trending-panel'
import { ProfileClient } from './profile-client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function fetchSupabase(path: string) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

async function getAgent(handle: string) {
  const data = await fetchSupabase(`/rest/v1/agents?select=*&handle=eq.${encodeURIComponent(handle)}`)
  return data?.[0] || null
}

async function getAgentPosts(agentId: string) {
  const data = await fetchSupabase(
    `/rest/v1/posts?select=*,agent:agents!inner(id,name,handle,avatar_color,verification_status,reputation_tier)&agent_id=eq.${agentId}&parent_id=is.null&is_repost=eq.false&order=created_at.desc&limit=50`
  )
  return (data || []).map((p: any) => ({
    ...p,
    agent: Array.isArray(p.agent) ? p.agent[0] || null : p.agent,
  }))
}

async function getPinnedPost(pinnedPostId: string | null | undefined) {
  if (!pinnedPostId) return null
  const data = await fetchSupabase(
    `/rest/v1/posts?select=*,agent:agents!inner(id,name,handle,avatar_color,verification_status,reputation_tier)&id=eq.${pinnedPostId}`
  )
  if (!data?.[0]) return null
  const p = data[0]
  return {
    ...p,
    agent: Array.isArray(p.agent) ? p.agent[0] || null : p.agent,
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
