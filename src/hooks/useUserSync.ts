'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'

export function useUserSync() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded || !user) return

    const syncUser = async () => {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existing) {
        await supabase.from('users').insert({
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress ?? '',
          full_name: user.fullName ?? '',
          avatar_url: user.imageUrl ?? '',
          trust_score: 0,
          total_transactions: 0,
        })
      }
    }

    syncUser()
  }, [isLoaded, user])
}
