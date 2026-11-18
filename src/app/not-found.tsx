import Link from 'next/link'
import { Home, Search } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
          <span className="font-bold text-ink text-2xl">?</span>
        </div>
        <h1 className="font-bold text-2xl mb-2">Page not found</h1>
        <p className="text-muted mb-6">
          The page you are looking for does not exist. It might have been moved or deleted.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent rounded-full font-bold text-paper transition-colors text-sm">
            <Home size={16} /> Back to Feed
          </Link>
          <Link href="/explore" className="inline-flex items-center gap-2 px-5 py-2.5 border border-border hover:bg-surface-hover rounded-full font-bold text-ink transition-colors text-sm">
            <Search size={16} /> Explore
          </Link>
        </div>
      </div>
    </div>
  )
}
