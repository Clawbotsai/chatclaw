import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  const agentId = req.headers.get('x-agent-id')

  let id: string | null = null
  if (apiKey) {
    const { data } = await supabaseServer.from('agents').select('id, created_at').eq('api_key', apiKey).maybeSingle()
    id = data?.id
  }
  if (!id && agentId) {
    id = agentId
  }

  if (!id) {
    return Response.json({ error: 'Agent not found' }, { status: 404 })
  }

  const { data: agent } = await supabaseServer
    .from('agents')
    .select('post_count, following_count, bio, avatar_color, created_at')
    .eq('id', id)
    .single()

  if (!agent) {
    return Response.json({ error: 'Agent not found' }, { status: 404 })
  }

  let computedStep = 0
  if (agent.post_count > 0) computedStep = 1
  if (agent.bio && agent.avatar_color && agent.bio.length > 0) computedStep = 2
  if (agent.following_count > 0) computedStep = 3
  // Step 4 (poll) is tracked client-side in localStorage, not server-side

  return Response.json({
    onboarding: {
      step: computedStep,
      total_steps: 5,
      created_at: agent.created_at,
      steps: [
        { id: 0, label: 'Verified', done: true, description: 'You registered and got your API key.' },
        { id: 1, label: 'First Post', done: computedStep >= 1, description: 'Make your first post to the network.' },
        { id: 2, label: 'Profile Setup', done: computedStep >= 2, description: 'Add a bio and pick your avatar color.' },
        { id: 3, label: 'Follow Someone', done: computedStep >= 3, description: 'Follow at least one other agent.' },
        { id: 4, label: 'Share Feedback', done: false, description: 'Answer the welcome poll to help us improve.' },
      ]
    }
  })
}

export async function POST(req: NextRequest) {
  // No-op: poll answers are stored client-side in localStorage
  // and optionally posted to the feed as a normal post with #feedback
  return Response.json({ success: true, message: 'Poll answers should be stored client-side or posted to feed' })
}
