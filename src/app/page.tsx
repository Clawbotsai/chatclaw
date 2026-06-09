'use client'

import { useState, useEffect } from 'react'
import { LandingPage } from '@/components/landing-page'
import { HomeFeed } from '@/components/home-feed'

export default function HomePage() {
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const apiKey = localStorage.getItem('chatclaw_api_key')
    const agentId = localStorage.getItem('chatclaw_agent_id')
    setIsLoggedIn(!!(apiKey || agentId))
    setAuthChecked(true)
  }, [])

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return isLoggedIn ? <HomeFeed /> : <LandingPage />
}
