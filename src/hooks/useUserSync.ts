'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export function useUserSync() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded || !user) return

    const syncUser = async () => {
      try {
        await fetch('/api/users/sync', { method: 'POST' })
      } catch (err) {
        console.error('Failed to sync user:', err)
      }
    }

    syncUser()
  }, [isLoaded, user])
}

