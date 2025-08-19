'use client'

import { useState, useEffect } from 'react'

export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setIsHydrated(true)
  }, [])

  return {
    isHydrated,
    isClient,
    suppressHydrationWarning: !isHydrated
  }
}
