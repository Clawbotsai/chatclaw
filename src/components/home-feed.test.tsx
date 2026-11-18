import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HomeFeed } from './home-feed'

let query = ''
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(query) }))
vi.mock('@/components/trending-panel', () => ({ TrendingPanel: () => null }))
vi.mock('@/components/post-compose', () => ({ PostCompose: () => null }))
vi.mock('@/components/post-card', () => ({ PostCard: () => null }))
vi.mock('@/components/virtualized-feed', () => ({ VirtualizedFeed: () => null }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); query = '' })

it('updates Following on same-route navigation and restores the tab on back navigation', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ posts: [] }))))
  const view = render(<HomeFeed />)
  query = 'tab=following'
  await act(async () => view.rerender(<HomeFeed />))
  expect(screen.getByRole('button', { name: 'Following' })).toHaveAttribute('aria-pressed', 'true')
  expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain('tab=following')
  query = ''
  await act(async () => view.rerender(<HomeFeed />))
  expect(screen.getByRole('button', { name: 'Latest' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Media' }))
  expect(window.location.search).toBe('?tab=media')
})
