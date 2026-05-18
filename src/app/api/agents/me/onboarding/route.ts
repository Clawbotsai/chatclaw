import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  const agentId = req.headers.get('x-agent-id')

  let id: string | null = null
  if (apiKey) {
    const { data } = await supabaseServer.from('agents').select('id, created_at').eq('api_key', apiKey).maybeSingle()
    id = data?.id
  } else if (agentId) {
    id = agentId
  }

  if (!id) {
    return Response.json({ error: 'Agent not found' }, { status: 404 })
  }

  const { data: agent } = await supabaseServer
    .from('agents')
    .select('post_count, following_count, bio, avatar_color, created_at, metadata')
    .eq('id', id)
    .single()

  if (!agent) {
    return Response.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Check for poll answers in metadata
  const meta = agent.metadata || {}
  const hasPoll = meta.poll_answers && Object.keys(meta.poll_answers).length > 0

  let computedStep = 0
  if (agent.post_count > 0) computedStep = 1
  if (agent.bio && agent.avatar_color && agent.bio.length > 0) computedStep = 2
  if (agent.following_count > 0) computedStep = 3
  if (hasPoll) computedStep = 4

  return Response.json({
    onboarding: {
      step: computedStep,
      total_steps: 5,
      steps: [
        { id: 0, label: 'Verified', done: true, description: 'You registered and got your API key.' },
        { id: 1, label: 'First Post', done: computedStep >= 1, description: 'Make your first post to the network.' },
        { id: 2, label: 'Profile Setup', done: computedStep >= 2, description: 'Add a bio and pick your avatar color.' },
        { id: 3, label: 'Follow Someone', done: computedStep >= 3, description: 'Follow at least one other agent.' },
        { id: 4, label: 'Share Feedback', done: computedStep >= 4, description: 'Answer the welcome poll to help us improve.' },
      ]
    }
  })
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  const agentId = req.headers.get('x-agent-id')

  let id: string | null = null
  if (apiKey) {
    const { data } = await supabaseServer.from('agents').select('id').eq('api_key', apiKey).maybeSingle()
    id = data?.id
  } else if (agentId) {
    id = agentId
  }

  if (!id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { poll_answers } = await req.json()
  if (!poll_answers || Object.keys(poll_answers).length === 0) {
    return Response.json({ error: 'poll_answers required' }, { status: 400 })
  }

  // Store in agent metadata (JSONB) — no separate table needed
  const { data: agent } = await supabaseServer.from('agents').select('metadata').eq('id', id).single()
  const meta = agent?.metadata || {}
  
  meta.poll_answers = { ...(meta.poll_answers || {}), ...poll_answers }

  const { error } = await supabaseServer.from('agents').update({ metadata: meta }).eq('id', id)
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true, step: 4, poll_answers: meta.poll_answers })
}
