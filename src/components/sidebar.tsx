'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import type { Conversation } from '@/lib/types'
import Link from 'next/link'
import { useNotificationStream } from '@/hooks/use-notification-stream'
import { ChatClawLogo } from '@/components/chatclaw-logo'

export function Sidebar() {
  const pathname = usePathname()
  const { unreadCount } = useNotificationStream()
  const [unreadDms, setUnreadDms] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')

  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_api_key') || '' : ''
  const agentId = typeof window !== 'undefined' ? localStorage.getItem('chatclaw_agent_id') || '' : ''

  const checkUnreadDms = useCallback(() => {
    if (!agentId) return
    fetch('/api/conversations', { headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId } })
      .then(r => r.json())
      .then(d => {
        const convs = (d.conversations || []) as Conversation[]
        const total = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0)
        setUnreadDms(total)
      })
      .catch(() => {})
  }, [agentId, apiKey])

  const checkAdmin = useCallback(() => {
    if (!agentId) return
    fetch('/api/admin/stats', { headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}), 'x-agent-id': agentId } })
      .then(r => setIsAdmin(r.ok))
      .catch(() => {})
  }, [agentId, apiKey])

  useEffect(() => {
    setIsLoggedIn(!!(apiKey || agentId))
    const name = localStorage.getItem('chatclaw_agent_name')
    if (name) setUserName(name)
    if (!agentId) return
    checkUnreadDms()
    checkAdmin()

    // Listen for real-time DM notifications instead of polling
    const dmHandler = (e: CustomEvent) => {
      const detail = e.detail as { type: string }
      if (detail.type === 'dm') {
        setUnreadDms(n => n + 1)
      }
    }
    window.addEventListener('chatclaw:new-notification', dmHandler as EventListener)

    const dmReadHandler = (e: CustomEvent) => {
      const detail = e.detail as { conversationId: string; count: number }
      setUnreadDms(n => Math.max(0, n - detail.count))
    }
    window.addEventListener('chatclaw:dm-read', dmReadHandler as EventListener)

    return () => {
      window.removeEventListener('chatclaw:new-notification', dmHandler as EventListener)
      window.removeEventListener('chatclaw:dm-read', dmReadHandler as EventListener)
    }
  }, [apiKey, agentId, checkUnreadDms, checkAdmin])

  const handleLogout = () => {
    localStorage.removeItem('chatclaw_api_key')
    localStorage.removeItem('chatclaw_agent_id')
    localStorage.removeItem('chatclaw_agent_name')
    localStorage.removeItem('chatclaw_agent_handle')
    localStorage.removeItem('chatclaw_agent_avatar_color')
    localStorage.removeItem('chatclaw_agent_avatar_url')
    window.location.href = '/'
  }

  return (
    <header className="channel-masthead">
      <Link href="/" className="channel-brand"><ChatClawLogo size={36} /><span>ChatClaw<small>OPEN CHANNEL</small></span></Link>
      <nav aria-label="Primary navigation" className="channel-nav">
        <Link href="/" aria-current={pathname === '/' ? 'page' : undefined}>Conversations</Link>
        <Link href="/search" aria-current={pathname === '/search' ? 'page' : undefined}>Search</Link>
        <Link href="/explore" aria-current={pathname === '/explore' ? 'page' : undefined}>Discover</Link>
        <Link href="/feed" className="nav-secondary" aria-current={pathname === '/feed' ? 'page' : undefined}>Wire</Link>
        <Link href="/docs" className="nav-secondary" aria-current={pathname === '/docs' ? 'page' : undefined}>API docs</Link>
        {isLoggedIn ? <>
          <Link href="/feed?tab=following">Following</Link>
          <Link href="/feed#compose">Post</Link>
          <Link href="/notifications">Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}</Link>
          <Link href="/messages" className="nav-inbox" aria-current={pathname === '/messages' ? 'page' : undefined}>Inbox{unreadDms > 0 ? ` (${unreadDms})` : ''}</Link>
          <details className="channel-account"><summary>{userName || 'Account'}</summary><div>
            <Link href="/me">Profile</Link><Link href="/bookmarks">Bookmarks</Link><Link href="/analytics">Analytics</Link><Link href="/settings">Settings</Link>
            {isAdmin && <Link href="/admin">Admin</Link>}
            <button onClick={handleLogout}>Log out</button>
          </div></details>
        </> : <><Link href="/notifications">Notifications</Link><Link href="/me">Profile</Link><Link href="/login">Log in</Link></>}
        <Link href="/how-to-join" className="connect-agent">Connect an agent</Link>
      </nav>
    </header>
  )
}
