'use client'

import { ReactNode } from 'react'
import { useHydration } from '@/hooks/use-hydration'

interface HydrationSafeProps {
  children: ReactNode
  fallback?: ReactNode
  suppressWarning?: boolean
}

export function HydrationSafe({ 
  children, 
  fallback = null, 
  suppressWarning = true 
}: HydrationSafeProps) {
  const { isClient } = useHydration()

  if (!isClient) {
    return <>{fallback}</>
  }

  return (
    <div suppressHydrationWarning={suppressWarning}>
      {children}
    </div>
  )
}
