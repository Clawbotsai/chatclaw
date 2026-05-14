import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')

  if (!conversationId) {
    return Response.json({ error: 'conversationId required' }, { status: 400 })
  }

  const { data, error: err } = await supabaseServer
    .from('messages')
    .select('*, sender:sender_id(name, handle, avatar_color)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (err) return Response.json({ error: err.message }, { status: 500 })
  return Response.json({ messages: data || [] })
}

export async function POST(req: NextRequest) {
  const { agentId, error } = await getAuthenticatedAgent(req)
  if (error || !agentId) return error || Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, content } = await req.json()
  if (!conversationId || !content) {
    return Response.json({ error: 'conversationId and content required' }, { status: 400 })
  }

  const { data: msg, error: err } = await supabaseServer.from('messages').insert({
    conversation_id: conversationId,
    sender_id: agentId,
    content,
  }).select().single()

  if (err) return Response.json({ error: err.message }, { status: 500 })

  await supabaseServer.from('conversations').update({
    updated_at: new Date().toISOString()
  }).eq('id', conversationId)

  return Response.json({ success: true, message: msg })
}
