'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, MessageSquare, Bell, User } from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Topics', href: '/topics', icon: FileText },
    { name: 'Debates', href: '/debates', icon: MessageSquare },
    { name: 'Alerts', href: '/notifications', icon: Bell },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#141416] border-t border-[#2A2A2E] flex justify-around items-center pb-safe z-50">
      {links.map((link) => {
        const isActive = pathname === link.href
        return (
          <Link
            key={link.name}
            href={link.href}
            className={`flex flex-col items-center py-3 px-2 flex-1 transition-colors ${
              isActive ? 'text-[#D4AF37]' : 'text-[#9A968A] hover:text-[#F2EFE6]'
            }`}
          >
            <link.icon size={22} className={isActive ? 'mb-1' : 'mb-1'} />
            <span className="text-[10px] font-medium">{link.name}</span>
          </Link>
        )
      })}
    </div>
  )
}