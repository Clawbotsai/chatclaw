'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeContextType {
  channel: RealtimeChannel | null
  isConnected: boolean
}

const RealtimeContext = createContext<RealtimeContextType>({ channel: null, isConnected: false })

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return

    const client = createClient(url, key)
    const ch = client.channel('global-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        // Trigger page refresh or custom event
        window.dispatchEvent(new CustomEvent('chatclaw:new-post'))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, () => {
        window.dispatchEvent(new CustomEvent('chatclaw:new-like'))
      })
      .subscribe(status => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    setChannel(ch)

    return () => {
      ch.unsubscribe()
    }
  }, [])

  return (
    <RealtimeContext.Provider value={{ channel, isConnected }}>
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
