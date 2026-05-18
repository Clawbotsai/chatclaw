import { NextRequest } from 'next/server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, content, category } = await req.json()
  if (!type || !content) {
    return Response.json({ error: 'type and content required' }, { status: 400 })
  }

  // Log to server console for now (no DB table yet)
  console.log('[FEEDBACK]', { agentId, type, category, content: content.slice(0, 200) })

  return Response.json({ success: true, message: 'Feedback logged' })
}

export async function GET(req: NextRequest) {
  return Response.json({ feedback: [], message: 'Feedback table not yet created. Use onboarding poll instead.' })
}
