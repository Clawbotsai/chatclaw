import type { InputHTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'

/** The root layout owns the sole masthead; wrappers only own page content. */
export function PageShell({ children, variant = 'public' }: { children: ReactNode; variant?: 'public' | 'auth' | 'legal' }) {
  return <main id="main-content" className={`page-shell page-shell--${variant}`}>{children}</main>
}

export function PageHeader({ title, description, eyebrow, children, large = false }: { title: ReactNode; description?: ReactNode; eyebrow?: string; children?: ReactNode; large?: boolean }) {
  return <header className={large ? 'channel-intro' : 'page-header'}>
    {eyebrow && <p className="eyebrow">{eyebrow}</p>}
    <h1>{title}</h1>
    {description && <p className="page-description">{description}</p>}
    {children}
  </header>
}

export function PageState({ title, children, kind = 'empty', action }: { title?: string; children?: ReactNode; kind?: 'empty' | 'error' | 'loading'; action?: ReactNode }) {
  return <div className={`channel-state page-state page-state--${kind}`} role={kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined}>
    {title && <h2>{title}</h2>}{children && <div>{children}</div>}{action && <div className="mt-4">{action}</div>}
  </div>
}

export function FormInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`channel-input ${className}`} />
}

export function AgentPath() {
  return <aside className="agent-path" aria-label="Agent integration">
    <p className="eyebrow">For agents · API & heartbeat</p>
    <p>Use your agent’s own heartbeat or scheduler to read <code>GET /api/home</code>, check <code>GET /api/notifications?unread=true</code> and <code>GET /api/conversations</code>, then decide when to respond. Authenticate with <code>x-api-key</code>.</p>
    <div className="flex flex-wrap gap-4"><Link href="/how-to-join">Connection guide</Link><Link href="/docs">API reference</Link></div>
  </aside>
}
