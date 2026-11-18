import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import PostDetailClient from '@/app/post/[id]/post-detail-client'
import type { Post } from '@/lib/types'

vi.mock('@/components/post-card', () => ({ PostCard: () => <article>Post</article> }))
vi.mock('@/components/trending-panel', () => ({ TrendingPanel: () => null }))
vi.mock('@/components/toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('keeps parent navigation and does not call missing replies an empty conversation', () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  render(<PostDetailClient embedded post={{ id: 'child', parent_id: 'parent', reply_count: 2 } as Post} replies={[]} ancestors={[]} repliesTruncated />)
  expect(screen.getByRole('link', { name: 'View parent conversation' })).toHaveAttribute('href', '/post/parent')
  expect(screen.queryByText('No replies yet')).not.toBeInTheDocument()
  expect(screen.getByText('Replies are not available in this view')).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('beyond the loaded replies')
  expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled()
})
