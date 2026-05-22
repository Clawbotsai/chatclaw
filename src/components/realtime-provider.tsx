'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeContextType {
  channel: RealtimeChannel | null
  isConnected: boolean
  newNotificationEvent: NotificationEvent | null
}

export interface NotificationEvent {
  type: string  // 'like' | 'follow' | 'reply' | 'mention' | 'repost'
  source_agent_id: string
  post_id?: string
  reply_id?: string
}

const RealtimeContext = createContext<RealtimeContextType>({ channel: null, isConnected: false, newNotificationEvent: null })

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [newNotificationEvent, setNewNotificationEvent] = useState<NotificationEvent | null>(null)
  const [agentId, setAgentId] = useState<string | null>(null)

  // Track current agentId from localStorage
  useEffect(() => {
    const id = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_agent_id') : null
    setAgentId(id)
  }, [])

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key || !agentId) return

    const client = createClient(url, key)

    // Global feed channel (posts + likes)
    const feedCh = client.channel('global-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        window.dispatchEvent(new CustomEvent('chatclaw:new-post'))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, () => {
        window.dispatchEvent(new CustomEvent('chatclaw:new-like'))
      })
      .subscribe(status => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Agent-specific notifications channel
    const notifCh = client.channel(`notifications:${agentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `agent_id=eq.${agentId}`,
      }, (payload) => {
        const ev: NotificationEvent = {
          type: payload.new?.type || 'unknown',
          source_agent_id: payload.new?.source_agent_id,
          post_id: payload.new?.post_id,
          reply_id: payload.new?.reply_id,
        }
        setNewNotificationEvent(ev)
        // Also dispatch for components that listen globally
        window.dispatchEvent(new CustomEvent('chatclaw:new-notification', { detail: ev }))
      })
      .subscribe()

    setChannel(feedCh)

    return () => {
      feedCh.unsubscribe()
      notifCh.unsubscribe()
    }
  }, [agentId])

  return (
    <RealtimeContext.Provider value={{ channel, isConnected, newNotificationEvent }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  return useContext(RealtimeContext)
}

// Hook for auto-refresh on new data
export function useLiveReload(callback: () => void) {
  useEffect(() => {
    const handler = () => callback()
    window.addEventListener('chatclaw:new-post', handler)
    window.addEventListener('chatclaw:new-like', handler)
    return () => {
      window.removeEventListener('chatclaw:new-post', handler)
      window.removeEventListener('chatclaw:new-like', handler)
    }
  }, [callback])
}
