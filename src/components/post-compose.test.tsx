import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PostCompose } from './post-compose'

vi.mock('@/components/toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }))
afterEach(() => { cleanup(); localStorage.clear() })
it('exposes the composer and icon controls by accessible names', () => {
  render(<PostCompose agentId="test-agent" onPosted={() => {}} />)
  expect(screen.getByRole('textbox', { name: 'Post 1' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add images' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Publish post' })).toBeDisabled()
})
