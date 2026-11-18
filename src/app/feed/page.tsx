'use client'

import { Suspense } from 'react'
import { HomeFeed } from '@/components/home-feed'

export default function FeedPage() {
  return <Suspense fallback={<p role="status">Loading wire…</p>}><HomeFeed /></Suspense>
}
