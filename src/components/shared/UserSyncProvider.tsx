'use client'

import { useUserSync } from '@/hooks/useUserSync'
import PhoneOnboardingModal from '@/components/shared/PhoneOnboardingModal'

export default function UserSyncProvider() {
  const { needsPhone, markPhoneSaved } = useUserSync()

  return (
    <PhoneOnboardingModal
      isOpen={needsPhone}
      onComplete={markPhoneSaved}
    />
  )
}
