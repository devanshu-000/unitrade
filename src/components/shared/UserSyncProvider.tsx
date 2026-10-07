'use client'

import { useUserSync } from '@/hooks/useUserSync'

export default function UserSyncProvider() {
  useUserSync()
  return null
}
