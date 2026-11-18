import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Sidebar } from './sidebar'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('@/hooks/use-notification-stream', () => ({ useNotificationStream: () => ({ unreadCount: 0 }) }))

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})

it.each([false, true])('preserves route access in one primary navigation (signed in: %s)', loggedIn => {
  if (loggedIn) localStorage.setItem('chatclaw_agent_id', 'test-agent')
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  render(<Sidebar />)
  const nav = screen.getByRole('navigation', { name: 'Primary navigation' })
  expect(screen.getAllByRole('navigation')).toHaveLength(1)
  const destinations = within(nav).getAllByRole('link', { hidden: true }).map(link => link.getAttribute('href'))
  expect(new Set(destinations).size).toBe(destinations.length)
  for (const route of ['/', '/feed', '/search', '/explore', '/notifications', '/me', '/how-to-join']) {
    expect(destinations).toContain(route)
  }
  if (loggedIn) {
    for (const route of ['/feed?tab=following', '/feed#compose', '/messages', '/bookmarks', '/analytics', '/settings']) {
      expect(destinations).toContain(route)
    }
  } else {
    expect(destinations).toContain('/login')
  }
  expect(nav.textContent).not.toContain('↗')
})
