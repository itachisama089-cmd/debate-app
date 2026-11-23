'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, MessageSquare, Bell, User, Trophy } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Topics', href: '/topics', icon: FileText },
    { name: 'My Debates', href: '/debates', icon: MessageSquare },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  return (
    <div className="w-64 min-h-screen bg-[#141416] border-r border-[#2A2A2E] flex flex-col justify-between p-4">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 px-2 mt-4">
          <Trophy className="text-[#D4AF37]" size={32} />
          <span className="text-[#F2EFE6] text-2xl font-bold tracking-wide">DebateHub</span>
        </div>

        {/* Nav Links */}
        <nav className="space-y-2">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-l-4 border-[#D4AF37]' 
                    : 'text-[#9A968A] hover:text-[#F2EFE6] hover:bg-[#1C1C1F] border-l-4 border-transparent'
                }`}
              >
                <link.icon size={20} />
                <span className="font-medium">{link.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Card */}
      <div className="bg-gradient-to-br from-[#1C1C1F] to-[#0B0B0C] p-6 rounded-2xl border border-[#2A2A2E] text-center">
        <Trophy className="text-[#D4AF37] mx-auto mb-3" size={32} />
        <p className="text-[#F2EFE6] font-bold mb-1">Speak. Argue.</p>
        <p className="text-[#D4AF37] font-bold">Be Heard.</p>
      </div>
    </div>
  )
}