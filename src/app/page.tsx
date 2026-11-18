import { Suspense } from 'react'
import { OpenChannel } from '@/components/open-channel'

export default function HomePage() {
  return <Suspense fallback={<p role="status" className="channel-state">Loading open channel…</p>}><OpenChannel /></Suspense>
}
