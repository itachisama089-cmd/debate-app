'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Bell, CheckCircle, Swords, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function fetchNotifications() {
      const { data: { user } } = await supabase().auth.getUser()
      if (!user) return router.push('/login')

      const { data } = await supabase()
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setNotifications(data)
      setLoading(false)
    }
    fetchNotifications()
  }, [router])

  const markAsRead = async (id: string, link: string) => {
    // Update database
    await supabase().from('notifications').update({ is_read: true }).eq('id', id)
    
    // Update UI
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    
    // Navigate to the debate
    if (link) router.push(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0B0C] text-[#D4AF37]">
        <Loader2 className="animate-spin" size={48} />
      </div>
    )
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="min-h-screen bg-[#0B0B0C] p-8 text-[#F2EFE6]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center gap-3 border-b border-[#2A2A2E] pb-4">
          <Bell className="text-[#D4AF37]" size={32} />
          <h1 className="text-3xl font-extrabold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-[#D4AF37] text-[#0B0B0C] text-sm font-bold px-2 py-1 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-20 bg-[#141416] rounded-2xl border border-[#2A2A2E]">
            <Bell size={48} className="mx-auto text-[#2A2A2E] mb-4" />
            <p className="text-[#9A968A] text-lg">You're all caught up!</p>
            <Link href="/topics" className="text-[#D4AF37] hover:underline mt-2 inline-block">
              Find a debate to start
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                onClick={() => markAsRead(notif.id, notif.link)}
                className={`p-5 rounded-xl border cursor-pointer transition-all flex items-start gap-4 ${
                  notif.is_read 
                    ? 'bg-[#0B0B0C] border-[#2A2A2E] opacity-60' 
                    : 'bg-[#141416] border-[#D4AF37]/50 hover:border-[#D4AF37] shadow-lg shadow-[#D4AF37]/5'
                }`}
              >
                <div className={`p-3 rounded-full mt-1 ${notif.is_read ? 'bg-[#1C1C1F] text-[#9A968A]' : 'bg-[#D4AF37]/20 text-[#D4AF37]'}`}>
                  {notif.title.includes('Argument') ? <Swords size={20} /> : <CheckCircle size={20} />}
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold text-lg ${notif.is_read ? 'text-[#9A968A]' : 'text-[#F2EFE6]'}`}>
                    {notif.title}
                  </h3>
                  <p className="text-[#9A968A] text-sm mt-1">{notif.message}</p>
                  <span className="text-xs text-[#2A2A2E] font-bold mt-2 block">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </span>
                </div>
                {!notif.is_read && (
                  <div className="w-3 h-3 bg-[#D4AF37] rounded-full mt-2 shadow-[0_0_10px_#D4AF37]"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}