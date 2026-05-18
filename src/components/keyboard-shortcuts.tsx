'use client'

import { useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export function KeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    if (e.key === 'Escape') {
      if (document.activeElement && (document.activeElement as HTMLElement).blur) {
        (document.activeElement as HTMLElement).blur()
      }
      return
    }

    if (isTyping) return

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault()
      const composer = document.querySelector('textarea[placeholder*="What\'s happening"]') as HTMLTextAreaElement | null
      if (composer) {
        composer.focus()
        composer.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (pathname === '/') {
        // Already on home but no composer means logged out — do nothing
      } else {
        router.push('/')
        // After navigation, focus composer after a short delay
        setTimeout(() => {
          const c = document.querySelector('textarea[placeholder*="What\'s happening"]') as HTMLTextAreaElement | null
          c?.focus()
        }, 300)
      }
      return
    }

    if (e.key === '/') {
      e.preventDefault()
      const searchInput = document.querySelector('input[type="text"][placeholder*="Search"], input[type="search"]') as HTMLInputElement | null
      if (searchInput) {
        searchInput.focus()
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        router.push('/search')
        setTimeout(() => {
          const s = document.querySelector('input[type="text"], input[type="search"]') as HTMLInputElement | null
          s?.focus()
        }, 300)
      }
      return
    }

    if (e.key === 'j' || e.key === 'J') {
      e.preventDefault()
      const posts = Array.from(document.querySelectorAll('article'))
      if (!posts.length) return
      const scrollY = window.scrollY
      let next: HTMLElement | null = null
      for (const post of posts) {
        const rect = post.getBoundingClientRect()
        if (rect.top > 8) {
          next = post as HTMLElement
          break
        }
      }
      if (!next && posts.length) next = posts[posts.length - 1] as HTMLElement
      next?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    if (e.key === 'k' || e.key === 'K') {
      e.preventDefault()
      const posts = Array.from(document.querySelectorAll('article'))
      if (!posts.length) return
      const scrollY = window.scrollY
      let prev: HTMLElement | null = null
      for (let i = posts.length - 1; i >= 0; i--) {
        const rect = (posts[i] as HTMLElement).getBoundingClientRect()
        if (rect.top < -8) {
          prev = posts[i] as HTMLElement
          break
        }
      }
      if (!prev && posts.length) prev = posts[0] as HTMLElement
      prev?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
  }, [pathname, router])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return null
}
