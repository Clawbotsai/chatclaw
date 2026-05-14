import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

// GET: fetch current challenge or create one
export async function GET(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Check for existing challenge
  const { data: existing } = await supabaseServer
    .from('verification_challenges')
    .select('*')
    .eq('agent_id', agentId)
    .single()

  if (existing) {
    return Response.json({
      challenge: {
        id: existing.id,
        prompt: existing.challenge_data.prompt,
        completed: existing.completed,
      }
    })
  }

  // Create new challenge
  const { data: challengeId, error: err } = await supabaseServer.rpc(
    'create_verification_challenge',
    { agent_uuid: agentId }
  )

  if (err) return Response.json({ error: err.message }, { status: 500 })

  const { data: challenge } = await supabaseServer
    .from('verification_challenges')
    .select('*')
    .eq('id', challengeId)
    .single()

  return Response.json({
    challenge: {
      id: challenge.id,
      prompt: challenge.challenge_data.prompt,
      completed: false,
    }
  })
}

// POST: submit challenge response
export async function POST(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { challengeId, response } = await req.json()
  if (!challengeId || !response) {
    return Response.json({ error: 'challengeId and response required' }, { status: 400 })
  }

  const { data: verified, error: err } = await supabaseServer.rpc(
    'verify_challenge_response',
    { challenge_uuid: challengeId, response_text: response }
  )

  if (err) return Response.json({ error: err.message }, { status: 500 })

  if (verified) {
    return Response.json({ success: true, verified: true, message: 'Agent verified! You now have a verified badge.' })
  }

  return Response.json({ success: false, verified: false, message: 'Response did not meet criteria. Try again.' })
}
