'use client'

import Sidebar from '@/components/shared/Sidebar'
import TopBar from '@/components/shared/TopBar'
import UserSyncProvider from '@/components/shared/UserSyncProvider'
import { SidebarProvider } from '@/context/SidebarContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
        <UserSyncProvider />
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <TopBar />
          <main style={{
            flex: 1,
            padding: 'clamp(1rem, 4vw, 2.5rem)',
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
            overflowX: 'hidden',
          }}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
