'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [complaints, setComplaints] = useState<any[]>([])

  useEffect(() => {
    async function checkAdminAndFetch() {
      const { data: { user } } = await supabase().auth.getUser()
      if (!user) return router.push('/login')

      // Check if the user is an admin
      const { data: profile } = await supabase()
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        // If not admin, kick them out
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)

      // Fetch complaints and join with user profiles to get usernames
      const { data: complaintsData } = await supabase()
        .from('complaints')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false })

      if (complaintsData) setComplaints(complaintsData)
      setLoading(false)
    }

    checkAdminAndFetch()
  }, [router])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0B0B0C] text-[#D4AF37]"><Loader2 className="animate-spin" size={48} /></div>
  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-[#0B0B0C] p-6 md:p-10 text-[#F2EFE6]">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/dashboard')} className="p-2 bg-[#1C1C1F] rounded-full hover:bg-[#2A2A2E] transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#D4AF37] flex items-center gap-2">
              <ShieldAlert /> Admin Dashboard
            </h1>
            <p className="text-[#9A968A]">Review user complaints and reports.</p>
          </div>
        </div>

        {/* Complaints List */}
        <div className="space-y-4">
          {complaints.length === 0 ? (
            <div className="text-center py-20 bg-[#141416] rounded-xl border border-[#2A2A2E]">
              <p className="text-[#9A968A] text-lg">No complaints submitted yet.</p>
            </div>
          ) : (
            complaints.map((complaint) => (
              <div key={complaint.id} className="bg-[#141416] p-6 rounded-xl border border-[#2A2A2E]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#F2EFE6]">{complaint.subject}</h3>
                    <p className="text-sm text-[#9A968A]">
                      From: <span className="text-[#D4AF37]">{complaint.profiles?.username || 'Unknown User'}</span> • {new Date(complaint.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${complaint.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                    {complaint.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-[#F2EFE6] bg-[#0B0B0C] p-4 rounded-lg border border-[#2A2A2E] whitespace-pre-wrap">
                  {complaint.message}
                </p>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}