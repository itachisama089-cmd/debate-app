'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trophy, Swords, CheckCircle, XCircle, MinusCircle, Loader2, Edit2, Save, X, Camera } from 'lucide-react'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [editError, setEditError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function fetchProfileData() {
    const { data: { user } } = await supabase().auth.getUser()
    if (!user) return router.push('/login')
    setUserId(user.id)

    const { data: profileData } = await supabase().from('profiles').select('*').eq('id', user.id).single()
    if (profileData) {
      setProfile(profileData)
      setEditUsername(profileData.username || '')
      setEditAvatarUrl(profileData.avatar_url || '')
    }

    const { data: historyData } = await supabase().from('debates').select('*, topics(title), judgments(winner_id)').or(`player_a.eq.${user.id},player_b.eq.${user.id}`).eq('status', 'completed').order('created_at', { ascending: false })
    if (historyData) setHistory(historyData)

    const { data: leaderboardData } = await supabase().from('profiles').select('id, username, points, avatar_url').order('points', { ascending: false }).limit(10)
    if (leaderboardData) setLeaderboard(leaderboardData)

    setLoading(false)
  }

  useEffect(() => { fetchProfileData() }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return setEditError('Image must be less than 2MB')

    setIsUploading(true)
    setEditError('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase().storage.from('avatars').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase().storage.from('avatars').getPublicUrl(fileName)
      setEditAvatarUrl(publicUrl)
    } catch (error: any) {
      setEditError(error.message || 'Error uploading image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUpdateProfile = async () => {
    setIsSaving(true)
    setEditError('')

    const { error } = await supabase().from('profiles').update({ username: editUsername, avatar_url: editAvatarUrl }).eq('id', userId)

    if (error) {
      setEditError(error.code === '23505' ? 'Username already taken.' : error.message)
      setIsSaving(false)
      return
    }

    await fetchProfileData()
    setIsEditing(false)
    setIsSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0B0B0C] text-[#D4AF37]"><Loader2 className="animate-spin" size={48} /></div>

  let wins = 0, losses = 0, draws = 0
  history.forEach(debate => {
    // Safely extract judgment data
    const judgment = Array.isArray(debate.judgments) ? debate.judgments[0] : debate.judgments
    if (!judgment) return
    
    if (!judgment.winner_id) draws++
    else if (judgment.winner_id === profile?.id) wins++
    else losses++
  })

  return (
    <div className="min-h-screen bg-[#0B0B0C] p-8 text-[#F2EFE6]">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#141416] p-8 rounded-2xl border border-[#2A2A2E] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-[#1C1C1F] to-[#141416] -z-10" />
            
            <div className="relative group mx-auto w-24 h-24 mb-4">
              <div className="w-24 h-24 bg-[#1C1C1F] rounded-full flex items-center justify-center text-4xl font-bold border-4 border-[#0B0B0C] shadow-lg overflow-hidden text-[#D4AF37]">
                {editAvatarUrl || profile?.avatar_url ? (
                  <img src={isEditing ? editAvatarUrl : profile?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile?.username?.charAt(0).toUpperCase()
                )}
              </div>
              {isEditing && (
                <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity border-4 border-[#D4AF37]">
                  {isUploading ? <Loader2 className="animate-spin text-white" size={24} /> : <><Camera className="text-white mb-1" size={24} /><span className="text-[10px] font-bold text-white">UPLOAD</span></>}
                </div>
              )}
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />

            {isEditing ? (
              <div className="space-y-3 mb-6 text-left">
                {editError && <p className="text-[#D9534F] text-xs text-center">{editError}</p>}
                <div>
                  <label className="text-xs text-[#9A968A] font-bold uppercase">Username</label>
                  <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-2 text-[#F2EFE6] mt-1 focus:outline-none focus:border-[#D4AF37]" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleUpdateProfile} disabled={isSaving || isUploading} className="flex-1 bg-[#D4AF37] hover:bg-[#E6C458] text-[#0B0B0C] font-bold py-2 rounded-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
                  </button>
                  <button onClick={() => { setIsEditing(false); setEditAvatarUrl(profile?.avatar_url || '') }} disabled={isSaving || isUploading} className="flex-1 bg-[#2A2A2E] hover:bg-[#3A3A3E] text-[#F2EFE6] font-bold py-2 rounded-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                    <X size={16} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold">{profile?.username}</h1>
                <p className="text-[#9A968A] text-sm mb-4">Debater</p>
                <button onClick={() => setIsEditing(true)} className="text-[#D4AF37] hover:text-[#E6C458] flex items-center gap-1 mx-auto text-sm transition-colors">
                  <Edit2 size={14} /> Edit Profile
                </button>
              </div>
            )}
            
            <div className="bg-[#0B0B0C] p-4 rounded-xl border border-[#2A2A2E] flex items-center justify-center gap-3 mt-4">
              <Trophy className="text-[#D4AF37]" size={28} />
              <div className="text-left">
                <p className="text-xs text-[#9A968A] uppercase tracking-wider font-bold">Total Points</p>
                <p className="text-2xl font-bold text-[#D4AF37]">{profile?.points || 0}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#141416] p-4 rounded-xl border border-[#2A2A2E] text-center">
              <CheckCircle className="text-[#3FA66B] mx-auto mb-2" size={20} />
              <p className="text-2xl font-bold text-[#F2EFE6]">{wins}</p>
              <p className="text-xs text-[#9A968A]">Wins</p>
            </div>
            <div className="bg-[#141416] p-4 rounded-xl border border-[#2A2A2E] text-center">
              <XCircle className="text-[#D9534F] mx-auto mb-2" size={20} />
              <p className="text-2xl font-bold text-[#F2EFE6]">{losses}</p>
              <p className="text-xs text-[#9A968A]">Losses</p>
            </div>
            <div className="bg-[#141416] p-4 rounded-xl border border-[#2A2A2E] text-center">
              <MinusCircle className="text-[#9A968A] mx-auto mb-2" size={20} />
              <p className="text-2xl font-bold text-[#F2EFE6]">{draws}</p>
              <p className="text-xs text-[#9A968A]">Draws</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          
          {/* UPDATED LEADERBOARD SECTION */}
          <div className="bg-[#141416] p-6 rounded-2xl border border-[#2A2A2E]">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Trophy className="text-[#D4AF37]" /> Global Leaderboard
            </h2>
            <div className="space-y-2">
              {leaderboard.map((player, index) => {
                const isRank1 = index === 0;
                return (
                  <div key={player.id} className={`flex items-center justify-between p-3 rounded-lg border w-full ${player.id === profile?.id ? 'bg-[#D4AF37]/10 border-[#D4AF37]/50' : isRank1 ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#141416] border-[#D4AF37]/30' : 'bg-[#0B0B0C] border-[#2A2A2E]'}`}>
                    
                    {/* LEFT SIDE: Rank, Avatar, Username */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className={`font-bold w-6 text-center shrink-0 ${isRank1 ? 'text-[#D4AF37] text-lg' : index === 1 ? 'text-[#C0C0C0]' : index === 2 ? 'text-[#CD7F32]' : 'text-[#9A968A]'}`}>
                        #{index + 1}
                      </span>
                      
                      <div className="shrink-0">
                        {player.avatar_url ? (
                          <img src={player.avatar_url} className="w-8 h-8 rounded-full object-cover border border-[#2A2A2E]" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#1C1C1F] flex items-center justify-center text-xs font-bold text-[#D4AF37]">
                            {player.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      <span className="font-medium truncate">
                        {player.username} {player.id === profile?.id && "(You)"}
                      </span>
                    </div>

                    {/* RIGHT SIDE: Points */}
                    <span className={`font-bold shrink-0 ml-2 text-right whitespace-nowrap ${isRank1 ? 'text-[#D4AF37]' : 'text-[#9A968A]'}`}>
                      {player.points} pts
                    </span>
                    
                  </div>
                )
              })}
            </div>
          </div>
          {/* END UPDATED LEADERBOARD SECTION */}

          <div className="bg-[#141416] p-6 rounded-2xl border border-[#2A2A2E]">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Swords className="text-[#D4AF37]" /> Match History
            </h2>
            {history.length === 0 ? (
              <p className="text-[#9A968A] text-center py-8">You haven't completed any debates yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((debate) => {
                  // Safe extraction for the history mapping
                  const judgment = Array.isArray(debate.judgments) ? debate.judgments[0] : debate.judgments
                  
                  // If no judgment exists, skip or show a neutral state
                  if (!judgment) {
                    return (
                      <div key={debate.id} className="bg-[#0B0B0C] p-4 rounded-xl border border-[#2A2A2E] flex justify-between items-center">
                        <div>
                          <p className="font-bold text-[#F2EFE6] mb-1">{debate.topics?.title}</p>
                          <p className="text-xs text-[#9A968A]">{new Date(debate.completed_at).toLocaleDateString()}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#1C1C1F] text-[#9A968A] border border-[#2A2A2E]">NO RESULT</span>
                      </div>
                    )
                  }

                  const isWin = judgment.winner_id === profile?.id
                  const isDraw = !judgment.winner_id
                  
                  return (
                    <div key={debate.id} className="bg-[#0B0B0C] p-4 rounded-xl border border-[#2A2A2E] flex justify-between items-center">
                      <div>
                        <p className="font-bold text-[#F2EFE6] mb-1">{debate.topics?.title}</p>
                        <p className="text-xs text-[#9A968A]">{new Date(debate.completed_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isDraw ? 'bg-[#1C1C1F] text-[#9A968A] border-[#2A2A2E]' : isWin ? 'bg-[#3FA66B]/10 text-[#3FA66B] border-[#3FA66B]/20' : 'bg-[#D9534F]/10 text-[#D9534F] border-[#D9534F]/20'}`}>
                        {isDraw ? 'DRAW' : isWin ? 'VICTORY' : 'DEFEAT'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}