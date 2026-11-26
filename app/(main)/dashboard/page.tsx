'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trophy, Flame, Swords, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [activeDebate, setActiveDebate] = useState<any>(null)
  const [stats, setStats] = useState({ wins: 0, total: 0 })
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [trendingTopics, setTrendingTopics] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function fetchDashboard() {
      const { data: { user } } = await supabase().auth.getUser()
      if (!user) return router.push('/login')

      // 1. Fetch User Profile
      const { data: profileData } = await supabase().from('profiles').select('*').eq('id', user.id).single()
      if (profileData) setProfile(profileData)

      // 2. Fetch Active Debate (Prioritize Live, then Waiting)
      const { data: activeData } = await supabase()
        .from('debates')
        .select('*, topics(title)')
        .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
        .in('status', ['live', 'waiting'])
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (activeData && activeData.length > 0) setActiveDebate(activeData[0])

      // 3. Fetch Match Stats
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

      // 4. Fetch Top 5 Leaderboard
      const { data: leaderboardData } = await supabase()
        .from('profiles')
        .select('id, username, points, avatar_url')
        .order('points', { ascending: false })
        .limit(5)
      if (leaderboardData) setLeaderboard(leaderboardData)

      // 5. Fetch Trending Topics
      const { data: topicsData } = await supabase()
        .from('topics')
        .select('*, debates(count)')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(3)
      
      if (topicsData) {
        // Sort by debate count
        const sorted = topicsData.sort((a: any, b: any) => {
          const countA = a.debates?.[0]?.count || 0
          const countB = b.debates?.[0]?.count || 0
          return countB - countA
        })
        setTrendingTopics(sorted)
      }

      setLoading(false)
    }

    fetchDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <Loader2 className="animate-spin text-[var(--color-gold)]" size={48} />
      </div>
    )
  }

  const winRate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto text-[var(--color-text)] min-h-screen">
      
      {/* Header & Stats Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-[var(--color-text)] mb-2">
            Welcome back, <span className="text-[var(--color-gold)]">{profile?.username}</span>
          </h1>
          <p className="text-[var(--color-text-muted)] text-lg">Ready to defend your stance today?</p>
        </div>

        {/* Quiet Stats */}
        <div className="flex items-center gap-6 md:gap-8 bg-[var(--color-surface)] px-6 py-3 rounded-2xl border border-[var(--color-border)]">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-1">Points</p>
            <p className="text-xl font-bold text-[var(--color-gold)]">{profile?.points || 0}</p>
          </div>
          <div className="w-px h-8 bg-[var(--color-border)]" />
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-1">Wins</p>
            <p className="text-xl font-bold text-[var(--color-pro)]">{stats.wins}</p>
          </div>
          <div className="w-px h-8 bg-[var(--color-border)]" />
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-1">Win Rate</p>
            <p className="text-xl font-bold text-[var(--color-text)]">{winRate}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Resume Debate */}
          {activeDebate && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">Resume your parley</h2>
              <div className="bg-gradient-to-r from-[var(--color-surface-raised)] to-[var(--color-surface)] p-6 md:p-8 rounded-2xl border border-[var(--color-gold)]/30 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md mb-3 inline-block ${
                      activeDebate.status === 'live' ? 'bg-[var(--color-pro)]/20 text-[var(--color-pro)]' : 'bg-[var(--color-gold)]/20 text-[var(--color-gold)]'
                    }`}>
                      {activeDebate.status === 'live' ? 'Live Now' : 'Waiting for Opponent'}
                    </span>
                    <h3 className="text-2xl font-serif font-bold mb-2">{activeDebate.topics?.title}</h3>
                    <p className="text-[var(--color-text-muted)] text-sm">Jump back into the debate room.</p>
                  </div>
                  <Link href={`/debate/${activeDebate.id}`}>
                    <Button size="lg" className="whitespace-nowrap shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                      Continue Debate <ArrowRight size={18} className="ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Trending Topics */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                <Flame className="text-[var(--color-gold)]" size={24} /> Trending Topics
              </h2>
              <Link href="/topics" className="text-sm text-[var(--color-gold)] hover:underline flex items-center gap-1">
                View All <ArrowRight size={16} />
              </Link>
            </div>
            
            <div className="space-y-3">
              {trendingTopics.map(topic => {
                const debateCount = topic.debates?.[0]?.count || 0
                return (
                  <Link href="/topics" key={topic.id} className="block group">
                    <div className="bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-gold)]/50 transition-colors flex justify-between items-center gap-4">
                      
                      {/* Thumbnail Image */}
                      {topic.image_url ? (
                        <img src={topic.image_url} alt={topic.title} className="w-12 h-12 rounded-lg object-cover border border-[var(--color-border)]" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[var(--color-surface-raised)] flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-muted)]">
                          <Swords size={20} />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] px-2 py-0.5 rounded-md uppercase">
                            {topic.category}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                            <Swords size={12} /> {debateCount} debates
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-gold)] transition-colors line-clamp-1">
                          {topic.title}
                        </h3>
                      </div>
                      <ArrowRight className="text-[var(--color-border)] group-hover:text-[var(--color-gold)] transition-colors" size={20} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
          
          {/* Top 5 Leaderboard */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Trophy className="text-[var(--color-gold)]" size={20} /> Top 5
              </h2>
              <Link href="/profile" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]">View all</Link>
            </div>
            
            <div className="space-y-4">
              {leaderboard.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold w-4 ${index === 0 ? 'text-[var(--color-gold)]' : 'text-[var(--color-text-muted)]'}`}>
                      {index + 1}
                    </span>
                    {player.avatar_url ? (
                      <img src={player.avatar_url} alt={player.username} className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)]" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center text-xs font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={`text-sm font-medium ${player.id === profile?.id ? 'text-[var(--color-gold)]' : 'text-[var(--color-text)]'}`}>
                      {player.username} {player.id === profile?.id && '(You)'}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[var(--color-text-muted)]">{player.points}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Start Call to Action */}
          <div className="bg-gradient-to-br from-[var(--color-surface-raised)] to-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 text-center">
            <Swords className="text-[var(--color-gold)] mx-auto mb-3" size={32} />
            <h3 className="text-lg font-serif font-bold mb-2">Start a new Parley</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">Pick a topic and choose your side.</p>
            <Link href="/topics">
              <Button className="w-full">Browse Topics</Button>
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}