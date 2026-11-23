'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Swords, Trophy, ArrowRight, Plus, Loader2, Play } from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [activeDebates, setActiveDebates] = useState<any[]>([])
  const [stats, setStats] = useState({ wins: 0, total: 0 })
  const router = useRouter()

  useEffect(() => {
    async function fetchDashboard() {
      const { data: { user } } = await supabase().auth.getUser()
      if (!user) return router.push('/login')

      const { data: profileData } = await supabase().from('profiles').select('*').eq('id', user.id).single()
      if (profileData) setProfile(profileData)

      // Fetch ACTIVE debates
      const { data: debatesData } = await supabase()
        .from('debates')
        .select('*, topics(title)')
        .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
        .in('status', ['waiting', 'live'])
        .order('created_at', { ascending: false })

      if (debatesData) {
        // We sort them so that "It's Your Turn" goes to the top, then we only keep the top 3
        const sorted = debatesData.sort((a, b) => {
          const aIsPlayerA = user.id === a.player_a
          const aIsTurn = a.status === 'live' && ((aIsPlayerA && (a.current_turn || 1) % 2 !== 0) || (!aIsPlayerA && (a.current_turn || 1) % 2 === 0))
          
          const bIsPlayerA = user.id === b.player_a
          const bIsTurn = b.status === 'live' && ((bIsPlayerA && (b.current_turn || 1) % 2 !== 0) || (!bIsPlayerA && (b.current_turn || 1) % 2 === 0))

          if (aIsTurn && !bIsTurn) return -1
          if (!aIsTurn && bIsTurn) return 1
          return 0
        })
        
        setActiveDebates(sorted.slice(0, 3)) // Only show top 3
      }

      // Fetch stats
      const { data: completedData } = await supabase()
        .from('debates')
        .select('id, judgments(winner_id)')
        .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
        .eq('status', 'completed')

      if (completedData) {
        let wins = 0
        completedData.forEach(d => {
          const judgment = Array.isArray(d.judgments) ? d.judgments[0] : d.judgments
          if (judgment?.winner_id === user.id) wins++
        })
        setStats({ wins, total: completedData.length })
      }

      setLoading(false)
    }

    fetchDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0B0C] text-[#D4AF37]">
        <Loader2 className="animate-spin" size={48} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C] p-8 text-[#F2EFE6]">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-[#141416] to-[#1C1C1F] p-8 rounded-2xl border border-[#2A2A2E] relative overflow-hidden flex justify-between items-center">
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold mb-2 text-[#F2EFE6]">
              Welcome back, <span className="text-[#D4AF37]">{profile?.username}</span>
            </h1>
            <p className="text-[#9A968A] text-lg">Ready to defend your stance today?</p>
          </div>
          <Trophy className="absolute -right-4 -bottom-4 text-[#D4AF37] opacity-10" size={180} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#141416] p-6 rounded-2xl border border-[#2A2A2E] flex flex-col justify-center">
                <p className="text-sm text-[#9A968A] font-bold uppercase tracking-wider mb-1">Total Points</p>
                <p className="text-3xl font-bold text-[#D4AF37]">{profile?.points || 0}</p>
              </div>
              <div className="bg-[#141416] p-6 rounded-2xl border border-[#2A2A2E] flex flex-col justify-center">
                <p className="text-sm text-[#9A968A] font-bold uppercase tracking-wider mb-1">Win Rate</p>
                <p className="text-3xl font-bold text-[#3FA66B]">
                  {stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="bg-[#141416] p-6 rounded-2xl border border-[#2A2A2E]">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Play size={18} className="text-[#D4AF37]" /> Quick Actions
              </h2>
              <div className="space-y-3">
                <Link href="/topics" className="w-full bg-gradient-to-r from-[#D4AF37] to-[#A8841F] hover:from-[#E6C458] hover:to-[#D4AF37] text-[#0B0B0C] font-bold py-3 px-4 rounded-xl flex items-center justify-between transition-all group">
                  <span className="flex items-center gap-2"><Plus size={18} /> Start New Debate</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/profile" className="w-full bg-[#1C1C1F] hover:bg-[#2A2A2E] border border-[#2A2A2E] text-[#F2EFE6] font-bold py-3 px-4 rounded-xl flex items-center justify-between transition-all">
                  <span className="flex items-center gap-2"><Trophy size={18} className="text-[#D4AF37]" /> View Leaderboard</span>
                  <ArrowRight size={18} className="text-[#9A968A]" />
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#141416] p-6 rounded-2xl border border-[#2A2A2E] min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Swords className="text-[#D4AF37]" /> Active Debates
                </h2>
                {activeDebates.length > 0 && (
                  <span className="text-xs text-[#9A968A]">Showing top 3</span>
                )}
              </div>

              {activeDebates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Swords size={48} className="text-[#2A2A2E] mb-4" />
                  <p className="text-[#9A968A] mb-4">You have no active debates right now.</p>
                  <Link href="/topics" className="text-[#D4AF37] hover:underline font-medium">
                    Find a topic to debate
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDebates.map((debate) => {
                    const isPlayerA = profile?.id === debate.player_a
                    const isPlayerATurn = (debate.current_turn || 1) % 2 !== 0
                    const isMyTurn = debate.status === 'live' && ((isPlayerA && isPlayerATurn) || (!isPlayerA && !isPlayerATurn))
                    
                    return (
                      <div key={debate.id} className="bg-[#0B0B0C] p-5 rounded-xl border border-[#2A2A2E] flex items-center justify-between hover:border-[#D4AF37]/50 transition-colors group">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              debate.status === 'live' ? 'bg-[#3FA66B]/20 text-[#3FA66B]' : 'bg-[#D4AF37]/20 text-[#D4AF37]'
                            }`}>
                              {debate.status === 'live' ? 'LIVE' : 'WAITING'}
                            </span>
                            {isMyTurn && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#D9534F]/20 text-[#D9534F] px-2 py-0.5 rounded-full animate-pulse">
                                It's Your Turn!
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-[#F2EFE6] text-lg">{debate.topics?.title}</h3>
                        </div>
                        
                        <Link 
                          href={`/debate/${debate.id}`}
                          className={`px-5 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                            isMyTurn 
                              ? 'bg-[#D4AF37] hover:bg-[#E6C458] text-[#0B0B0C]' 
                              : 'bg-[#1C1C1F] hover:bg-[#2A2A2E] text-[#F2EFE6] border border-[#2A2A2E]'
                          }`}
                        >
                          {isMyTurn ? 'Enter Room' : 'View Room'}
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}