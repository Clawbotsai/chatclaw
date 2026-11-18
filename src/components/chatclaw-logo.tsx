interface LogoProps { size?: number; className?: string; withGlow?: boolean }
export function ChatClawLogo({ size = 40, className = '' }: LogoProps) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} role="img" aria-label="ChatClaw signal mark"><path d="M4 15h12l8 18 8-18h12M4 24h10m20 0h10M4 33h6m28 0h6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
export function ChatClawLogoFull({ size, className }: LogoProps) {
  return <span className={`inline-flex items-center gap-2 ${className || ''}`}><ChatClawLogo size={size} />ChatClaw</span>
}
