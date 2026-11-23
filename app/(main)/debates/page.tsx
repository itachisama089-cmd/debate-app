'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Swords, ArrowRight, CheckCircle, XCircle, MinusCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function MyDebatesPage() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeDebates, setActiveDebates] = useState<any[]>([])
  const [pastDebates, setPastDebates] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function fetchMyDebates() {
      const { data: { user } } = await supabase().auth.getUser()
      if (!user) return router.push('/login')
      setUserId(user.id)

      const { data } = await supabase()
        .from('debates')
        .select('*, topics(title, side_a_label, side_b_label), judgments(winner_id, judge_type)')
        .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (data) {
        const active = data.filter(d => d.status === 'waiting' || d.status === 'live' || d.status === 'judging')
        const past = data.filter(d => d.status === 'completed' || d.status === 'forfeited')
        setActiveDebates(active)
        setPastDebates(past)
      }
      setLoading(false)
    }
    fetchMyDebates()
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
      <div className="max-w-5xl mx-auto space-y-10">
        
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 mb-6">
            <Swords className="text-[#D4AF37]" size={32} /> My Debates
          </h1>
          <h2 className="text-xl font-bold text-[#9A968A] mb-4 uppercase tracking-wider text-sm">Active & Pending</h2>
          
          {activeDebates.length === 0 ? (
            <div className="bg-[#141416] p-8 rounded-2xl border border-[#2A2A2E] text-center">
              <p className="text-[#9A968A] mb-4">You don't have any active debates right now.</p>
              <Link href="/topics" className="bg-gradient-to-r from-[#D4AF37] to-[#A8841F] text-[#0B0B0C] font-bold py-2 px-6 rounded-lg inline-block">Start a Debate</Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeDebates.map((debate) => {
                const isPlayerA = userId === debate.player_a
                const isMyTurn = debate.status === 'live' && ((isPlayerA && (debate.current_turn || 1) % 2 !== 0) || (!isPlayerA && (debate.current_turn || 1) % 2 === 0))
                
                return (
                  <div key={debate.id} className="bg-[#141416] p-6 rounded-2xl border border-[#2A2A2E] hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                          debate.status === 'waiting' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 
                          debate.status === 'judging' ? 'bg-[#9A968A]/20 text-[#9A968A]' : 'bg-[#A3B18A]/20 text-[#A3B18A]'
                        }`}>
                          {debate.status === 'waiting' ? 'Waiting for Opponent' : debate.status === 'judging' ? 'Awaiting Verdict' : 'Live Now'}
                        </span>
                        {isMyTurn && <span className="text-[10px] font-bold uppercase bg-[#BC4749]/20 text-[#BC4749] px-2 py-1 rounded-full animate-pulse">Your Turn!</span>}
                      </div>
                      <h3 className="text-xl font-bold mb-2">{debate.topics?.title}</h3>
                    </div>
                    <Link 
                      href={`/debate/${debate.id}`}
                      className="mt-4 w-full bg-[#1C1C1F] hover:bg-[#2A2A2E] border border-[#2A2A2E] text-[#F2EFE6] font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      Enter Room <ArrowRight size={16} />
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-[#9A968A] mb-4 uppercase tracking-wider text-sm">Match History</h2>
          {pastDebates.length === 0 ? (
            <p className="text-[#9A968A]">No completed debates yet.</p>
          ) : (
            <div className="space-y-3">
              {pastDebates.map((debate) => {
                const judgment = Array.isArray(debate.judgments) ? debate.judgments[0] : debate.judgments
                const isPlayerA = userId === debate.player_a
                const myStanceLabel = isPlayerA ? debate.topics?.side_a_label : debate.topics?.side_b_label
                const opponentStanceLabel = isPlayerA ? debate.topics?.side_b_label : debate.topics?.side_a_label
                
                const isWin = judgment?.winner_id === userId
                const isDraw = judgment && !judgment.winner_id
                
                return (
                  <div key={debate.id} className="bg-[#141416] p-5 rounded-xl border border-[#2A2A2E] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#F2EFE6] mb-1">{debate.topics?.title}</h3>
                      <p className="text-sm text-[#9A968A]">
                        You argued <span className="text-[#D4AF37] font-medium">{myStanceLabel}</span> against {opponentStanceLabel}
                      </p>
                      <p className="text-xs text-[#2A2A2E] font-bold mt-1">{new Date(debate.completed_at).toLocaleDateString()}</p>
                    </div>
                    
                    <div className={`px-4 py-2 rounded-lg font-bold text-sm border flex items-center gap-2 min-w-[120px] justify-center ${
                      isDraw ? 'bg-[#1C1C1F] text-[#9A968A] border-[#2A2A2E]' : 
                      isWin ? 'bg-[#A3B18A]/10 text-[#A3B18A] border-[#A3B18A]/30' : 
                      'bg-[#BC4749]/10 text-[#BC4749] border-[#BC4749]/30'
                    }`}>
                      {isDraw ? <><MinusCircle size={16}/> Draw</> : isWin ? <><CheckCircle size={16}/> Victory</> : <><XCircle size={16}/> Defeat</>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}