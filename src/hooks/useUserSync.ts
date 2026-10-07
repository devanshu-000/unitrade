'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'

export function useUserSync() {
  const { user, isLoaded } = useUser()
  const [needsPhone, setNeedsPhone] = useState(false)

  useEffect(() => {
    if (!isLoaded || !user) return

    const syncUser = async () => {
      const { data: existing } = await supabase
        .from('users')
        .select('id, phone_number')
        .eq('id', user.id)
        .single()

      if (!existing) {
        // FIX: include phone_number: null explicitly so the column exists on the row.
        // Without this, a PATCH to save phone_number immediately after signup
        // could race against the insert and find 0 rows → Supabase throws
        // "Cannot coerce the result to a single JSON object".
        await supabase.from('users').insert({
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress ?? '',
          full_name: user.fullName ?? '',
          avatar_url: user.imageUrl ?? '',
          trust_score: 0,
          total_transactions: 0,
          phone_number: null,
        })
        // Brand new user — definitely needs phone
        setNeedsPhone(true)
      } else if (!existing.phone_number) {
        // Existing user but phone missing
        setNeedsPhone(true)
      }
    }

    syncUser()
  }, [isLoaded, user])

  const markPhoneSaved = () => setNeedsPhone(false)

  return { needsPhone, markPhoneSaved }
}
