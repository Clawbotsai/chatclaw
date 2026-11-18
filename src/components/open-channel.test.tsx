import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OpenChannel } from './open-channel'
import { CONVERSATION_TIMEOUT_MS } from '@/lib/conversation-fetch'

let query = ''
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(query) }))
vi.mock('@/app/post/[id]/post-detail-client', () => ({ default: () => <div>Loaded exchange</div> }))

beforeEach(() => {
  query = ''
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Open Channel loading', () => {
  it('ends a stalled index request and recovers with explicit retry', async () => {
    render(<OpenChannel />)
    expect(screen.getByText('Loading conversations…')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(CONVERSATION_TIMEOUT_MS))
    expect(screen.queryByText('Loading conversations…')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Conversations could not be loaded')
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ posts: [], nextCursor: null })))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry' })))
    expect(screen.getByText('No conversations yet.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('bounds a stalled response body and offers retry for the reader', async () => {
    query = 'thread=example'
    vi.mocked(fetch).mockImplementation(async () => ({
      ok: true, json: () => new Promise(() => {}),
    }) as Response)
    render(<OpenChannel />)
    await act(() => vi.advanceTimersByTimeAsync(CONVERSATION_TIMEOUT_MS))
    expect(screen.queryByText('Loading exchange…')).not.toBeInTheDocument()
    expect(screen.getByText(/This exchange is unavailable/)).toHaveTextContent('Retry')
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(2)
  })

  it('does not add a competing route navigation or internal external-arrow marks', () => {
    const { container } = render(<OpenChannel />)
    expect(container.querySelector('.channel-tabs')).toBeNull()
    expect(container.textContent).not.toContain('↗')
  })

  it('can load public conversations when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Unavailable') })
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ posts: [] })))
    await act(async () => { render(<OpenChannel />) })
    expect(screen.getByText('No conversations yet.')).toBeInTheDocument()
  })

  it('times out participant details and recovers on retry', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {}
      observe() { this.callback([{ isIntersecting: true }]) }
      disconnect() {}
    })
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      posts: [{ id: 'one', content: 'A conversation', created_at: '2026-11-17', reply_count: 1 }],
    })))
    await act(async () => { render(<OpenChannel />) })
    expect(screen.getByText('Loading participants…')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(CONVERSATION_TIMEOUT_MS))
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      replies: [{ agent: { handle: 'reader' } }],
    })))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry participants' })))
    expect(screen.getByRole('link', { name: '@reader' })).toHaveAttribute('href', '/agent/reader')
  })

  it('aborts pending work on unmount', () => {
    const { unmount } = render(<OpenChannel />)
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal
    unmount()
    expect(signal?.aborted).toBe(true)
  })
})


it('rejects malformed thread data instead of reporting an empty exchange', async () => {
  query = 'thread=broken'
  vi.mocked(fetch).mockImplementation(async input => new Response(JSON.stringify(
    String(input).includes('/replies') ? { replies: [] } : String(input).includes('/broken') ? { post: null } : { posts: [] }
  )))
  await act(async () => { render(<OpenChannel />) })
  expect(screen.getByRole('alert')).toHaveTextContent('This exchange is unavailable')
  expect(screen.queryByText('Loaded exchange')).not.toBeInTheDocument()
})

it('keeps canonical permalinks while opening desktop selections in the reader', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ posts: [{ id: 'one', content: 'Read this', created_at: '2026-11-17', reply_count: 0 }] })))
  await act(async () => { render(<OpenChannel />) })
  const link = screen.getByRole('link', { name: 'Read this' })
  expect(link).toHaveAttribute('href', '/post/one')
  const push = vi.spyOn(window.history, 'pushState')
  fireEvent.click(link)
  expect(push).toHaveBeenCalledWith(null, '', '/?thread=one')
  push.mockClear()
  // Preserve browser handling for open-in-new-tab gestures.
  link.addEventListener('click', event => event.preventDefault())
  fireEvent.click(link, { ctrlKey: true })
  expect(push).not.toHaveBeenCalled()
})
