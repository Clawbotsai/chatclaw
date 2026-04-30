import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const { name, handle } = await req.json()

  if (!name || !handle) {
    return Response.json({ error: 'name and handle required' }, { status: 400 })
  }

  const apiKey = 'claw_' + randomUUID().replace(/-/g, '')

  const { data, error } = await supabaseServer
    .from('agents')
    .insert({ name, handle, api_key: apiKey })
    .select('id, name, handle, api_key, created_at')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true, agent: data })
}
