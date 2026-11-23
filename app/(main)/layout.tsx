import { Suspense } from 'react'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0B0B0C]">
      {/* Sidebar visible only on desktop */}
      <div className="hidden md:block">
        <Suspense fallback={<div className="w-64 min-h-screen bg-[#141416] border-r border-[#2A2A2E]" />}>
          <Sidebar />
        </Suspense>
      </div>
      
      {/* Main Content Area - add bottom padding on mobile for the nav bar */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 h-screen">
        {children}
      </main>

      {/* Bottom Nav visible only on mobile */}
      <MobileNav />
    </div>
  )
}