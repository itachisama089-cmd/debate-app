'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Send, Scale, Clock, CheckCircle, Loader2, Image as ImageIcon, X, Gavel, UserCheck } from 'lucide-react'

function DebateRoomContent() {
  const params = useParams()
  const debateId = params.id as string
  const router = useRouter()
  
  const [debate, setDebate] = useState<any>(null)
  const [topic, setTopic] = useState<any>(null)
  const [turns, setTurns] = useState<any[]>([])
  const [judgment, setJudgment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [currentUrl, setCurrentUrl] = useState('')
  const [timeLeft, setTimeLeft] = useState<string>('')
  
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isSubmittingVerdict, setIsSubmittingVerdict] = useState(false)
  const [winnerSelection, setWinnerSelection] = useState<'player_a' | 'player_b' | 'draw'>('player_a')
  const [judgeRationale, setJudgeRationale] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  async function fetchDebate() {
    const { data: { user } } = await supabase().auth.getUser()
    if (user) setUserId(user.id)

    const { data: debateData } = await supabase().from('debates').select('*, topics(title, side_a_label, side_b_label)').eq('id', debateId).single()
    if (debateData) { setDebate(debateData); setTopic(debateData.topics) }

    // CHANGED: Order by created_at instead of turn_number
    const { data: turnsData } = await supabase().from('turns').select('*').eq('debate_id', debateId).order('created_at', { ascending: true })
    if (turnsData) setTurns(turnsData)

    const { data: judgeData } = await supabase().from('judgments').select('*').eq('debate_id', debateId).single()
    if (judgeData) setJudgment(judgeData)

    setLoading(false)
  }

  useEffect(() => {
    fetchDebate()
    setCurrentUrl(window.location.href)

    const channel = supabase().channel(`room:${debateId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'turns', filter: `debate_id=eq.${debateId}` }, (payload) => { setTurns((prev) => [...prev, payload.new]) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'turns', filter: `debate_id=eq.${debateId}` }, (payload) => { setTurns((prev) => prev.map(t => t.id === payload.new.id ? payload.new : t)) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'debates', filter: `id=eq.${debateId}` }, (payload) => { setDebate((prev: any) => ({ ...prev, ...payload.new })) })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'judgments', filter: `debate_id=eq.${debateId}` }, (payload) => { setJudgment(payload.new) })
      .subscribe()

    return () => { supabase().removeChannel(channel) }
  }, [debateId])

  useEffect(() => {
    if (debate?.player_a && debate?.player_b) {
      const fetchProfiles = async () => {
        const { data } = await supabase()
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', [debate.player_a, debate.player_b])
        
        if (data) {
          const profileMap: Record<string, any> = {}
          data.forEach(p => { profileMap[p.id] = p })
          setProfiles(profileMap)
        }
      }
      fetchProfiles()
    }
  }, [debate?.player_a, debate?.player_b])

  useEffect(() => {
    if (!debate?.deadline || debate.status !== 'live') return
    const interval = setInterval(() => {
      const now = new Date().getTime()
      const distance = new Date(debate.deadline).getTime() - now
      if (distance < 0) {
        clearInterval(interval); setTimeLeft("Time's up!")
        if (debate.status === 'live' && !debate.judge_id) {
          fetch('/api/judge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ debate_id: debateId }) })
        } else if (debate.status === 'live' && debate.judge_id) {
          fetch(`/api/debates/${debateId}/done`, { method: 'POST' })
        }
        return
      }
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((distance % (1000 * 60)) / 1000)
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
    }, 1000)
    return () => clearInterval(interval)
  }, [debate?.deadline, debate?.status, debateId])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [turns])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return alert("Image must be less than 5MB")
    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!message.trim() && !selectedImage) || !debate || isSubmitting) return
    
    setIsSubmitting(true)
    let uploadedImageUrl = null

    try {
      if (selectedImage) {
        setIsUploading(true)
        const fileExt = selectedImage.name.split('.').pop()
        const fileName = `${debateId}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase().storage.from('chat-images').upload(fileName, selectedImage)
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)
        const { data: { publicUrl } } = supabase().storage.from('chat-images').getPublicUrl(fileName)
        uploadedImageUrl = publicUrl
        setIsUploading(false)
      }

      // CHANGED: Removed turn_number from the payload
      const res = await fetch(`/api/debates/${debateId}/turns`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ content: message || "[Image sent]", image_url: uploadedImageUrl }) 
      })
      
      if (res.ok) { setMessage(''); clearImage() } 
      else { const errorData = await res.json(); alert(`Error: ${errorData.error}`) }
    } catch (error: any) { alert(error.message); setIsUploading(false) } 
    finally { setIsSubmitting(false) }
  }

  const handleJoin = async () => {
    const res = await fetch(`/api/debates/${debateId}/join`, { method: 'POST' })
    if (res.ok) fetchDebate()
    else { const err = await res.json(); alert(`Failed to join: ${err.error}`) }
  }

  const handleBecomeJudge = async () => {
    const res = await fetch(`/api/debates/${debateId}/assign-judge`, { method: 'POST' })
    if (res.ok) fetchDebate()
    else { const err = await res.json(); alert(`Failed: ${err.error}`) }
  }

  const handleDone = async () => {
    if (!window.confirm("Are you sure you are done? You will not be able to send further arguments.")) return
    const res = await fetch(`/api/debates/${debateId}/done`, { method: 'POST' })
    if (!res.ok) alert('Failed to finish debate')
  }

  const handleSubmitVerdict = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingVerdict(true)
    
    const finalWinner = winnerSelection === 'draw' ? 'draw' : winnerSelection === 'player_a' ? debate.player_a : debate.player_b

    const res = await fetch(`/api/debates/${debateId}/human-verdict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner_id: finalWinner, rationale: judgeRationale })
    })

    if (!res.ok) alert("Failed to submit verdict")
    setIsSubmittingVerdict(false)
  }

  if (loading) return <div className="p-8 text-center text-[#F2EFE6] min-h-screen bg-[#0B0B0C]">Loading room...</div>
  if (!debate) return <div className="p-8 text-center text-[#D9534F] min-h-screen bg-[#0B0B0C]">Debate not found.</div>

  const isPlayerA = userId === debate.player_a
  const isPlayerB = userId === debate.player_b
  const isJudge = userId === debate.judge_id
  const isSpectator = !isPlayerA && !isPlayerB && !isJudge

  // CHANGED: Removed isPlayerATurn. Players can just chat if it's live and they aren't done.
  const myDoneStatus = isPlayerA ? debate.player_a_done : debate.player_b_done
  const canChat = debate.status === 'live' && !myDoneStatus
  
  const proColor = 'text-[#A3B18A]'
  const proBg = 'bg-[#A3B18A]/20 border-[#A3B18A]/30'
  const conColor = 'text-[#BC4749]'
  const conBg = 'bg-[#BC4749]/20 border-[#BC4749]/30'

  const myStance = isPlayerA ? debate.stance_a : (debate.stance_a === 'pro' ? 'con' : 'pro')
  const myStanceLabel = myStance === 'pro' ? (topic?.side_a_label || 'Pro') : (topic?.side_b_label || 'Con')
  const myColorClass = myStance === 'pro' ? `${proColor} ${proBg}` : `${conColor} ${conBg}`

  // 1. WAITING ROOM
  if (debate.status === 'waiting') {
    return (
      <div className="min-h-screen bg-[#0B0B0C] p-8 flex flex-col items-center justify-center text-[#F2EFE6]">
        <div className="max-w-2xl w-full bg-[#141416] p-10 rounded-xl border border-[#2A2A2E] text-center">
          <h1 className="text-3xl font-extrabold mb-3 text-[#F2EFE6]">Topic: {topic?.title}</h1>
          {!isSpectator && <p className="text-[#9A968A] mb-8">You are arguing <span className={`font-bold px-2 py-1 rounded-md ${myColorClass}`}>{myStanceLabel}</span></p>}
          
          {isSpectator ? (
             <div className="bg-[#0B0B0C] p-6 rounded-lg border border-[#D4AF37] mb-8">
                <Gavel className="mx-auto text-[#D4AF37] mb-4" size={48} />
                <p className="text-lg font-medium mb-4 text-[#D4AF37]">You have been invited to Judge!</p>
                <button onClick={handleBecomeJudge} className="mt-2 bg-[#D4AF37] hover:bg-[#E6C458] text-[#0B0B0C] font-bold py-3 px-8 rounded-lg transition-colors">Accept Judge Role</button>
             </div>
          ) : debate.is_private ? (
            isPlayerA ? (
              <div className="bg-[#0B0B0C] p-6 rounded-lg border border-[#D4AF37] mb-8">
                <p className="text-lg font-medium mb-4 text-[#D4AF37]">Waiting for opponent...</p>
                <code className="block bg-[#1C1C1F] p-3 rounded-lg text-sm text-[#F2EFE6] select-all w-full mx-auto break-all">{currentUrl}</code>
              </div>
            ) : (
              <div className="bg-[#0B0B0C] p-6 rounded-lg border border-[#D4AF37] mb-8">
                <p className="text-lg font-medium mb-4 text-[#D4AF37]">You have been invited to a private debate!</p>
                <button onClick={handleJoin} className="mt-2 bg-[#D4AF37] hover:bg-[#E6C458] text-[#0B0B0C] font-bold py-3 px-8 rounded-lg transition-colors">Join Debate</button>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center mb-8 bg-[#0B0B0C] p-6 rounded-lg border border-[#2A2A2E]">
              <Loader2 className="text-[#D4AF37] animate-spin mb-4" size={48} />
              <p className="text-lg font-medium text-[#D4AF37]">Finding an Opponent...</p>
            </div>
          )}
          <button onClick={() => router.push('/topics')} className="text-[#9A968A] hover:text-[#F2EFE6] transition-colors py-3">Leave</button>
        </div>
      </div>
    )
  }

  // 2. VERDICT SCREEN
  if (debate.status === 'completed' && judgment) {
    const iWon = (isPlayerA && judgment.winner_id === debate.player_a) || (isPlayerB && judgment.winner_id === debate.player_b)
    const isDraw = judgment.winner_id === null
    
    return (
      <div className="min-h-screen bg-[#0B0B0C] p-8 flex flex-col items-center justify-center text-[#F2EFE6]">
        <div className="max-w-2xl w-full bg-[#141416] p-8 rounded-xl border border-[#2A2A2E] shadow-2xl">
          <div className="text-center mb-8">
            <Scale className="mx-auto text-[#D4AF37] mb-4" size={48} />
            <h1 className="text-3xl font-extrabold mb-2">Debate Concluded</h1>
            <p className="text-[#9A968A]">Judged by: {judgment.judge_type === 'human' ? 'Third Party' : 'AI'}</p>
          </div>
          <div className={`p-6 rounded-xl text-center mb-8 border ${isDraw ? 'bg-[#1C1C1F] border-[#2A2A2E]' : iWon ? 'bg-[#A3B18A]/10 border-[#A3B18A]/50' : 'bg-[#BC4749]/10 border-[#BC4749]/50'}`}>
            <h2 className="text-2xl font-bold mb-2">{isDraw ? "It's a Draw / Void!" : iWon ? "You Won! 🏆" : "You Lost"}</h2>
            <p className="text-[#F2EFE6] text-sm whitespace-pre-wrap">{judgment.rationale}</p>
          </div>
          <button onClick={() => router.push('/topics')} className="w-full bg-[#D4AF37] hover:bg-[#E6C458] text-[#0B0B0C] font-bold py-3 rounded-lg transition-colors">Back to Topics</button>
        </div>
      </div>
    )
  }

  // 3. LIVE CHAT / JUDGING SCREEN
  return (
    <div className="min-h-screen bg-[#0B0B0C] p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full bg-[#141416] rounded-xl border border-[#2A2A2E] flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2E] flex justify-between items-center bg-[#0B0B0C] rounded-t-xl">
          <div>
            <div className="flex items-center gap-4">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${debate.status === 'live' ? 'text-[#A3B18A] bg-[#A3B18A]/10' : 'text-[#D4AF37] bg-[#D4AF37]/10'}`}>
                {debate.status === 'judging' ? 'Awaiting Verdict' : debate.status}
              </span>
              {debate.status === 'live' && (
                <span className="flex items-center gap-1 text-sm text-[#D4AF37] font-mono bg-[#1C1C1F] px-3 py-1 rounded-full border border-[#2A2A2E]"><Clock size={14} /> {timeLeft}</span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-[#F2EFE6] mt-2">Topic: {topic?.title}</h1>
          </div>
          <div className="text-right">
            {isJudge && <span className="flex items-center gap-1 text-[#D4AF37] font-bold text-sm bg-[#D4AF37]/10 px-3 py-1 rounded-full mb-2"><Gavel size={14} /> You are the Judge</span>}
            {!isJudge && debate.judge_id && <span className="flex items-center gap-1 text-[#9A968A] text-sm mb-2"><UserCheck size={14} /> Human Judge Assigned</span>}
            <button onClick={() => router.push('/topics')} className="block text-[#9A968A] hover:text-[#F2EFE6] text-sm ml-auto">Leave Room</button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {turns.map((turn) => {
            const isMe = turn.user_id === userId
            const profile = profiles[turn.user_id]
            
            const username = profile?.username || (turn.user_id === debate.player_a ? (topic?.side_a_label || 'Player A') : (topic?.side_b_label || 'Player B'))
            const avatarUrl = profile?.avatar_url

            return (
              <div key={turn.id} className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {/* Opponent Avatar */}
                {!isMe && (
                  <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0 bg-[#2A2A2E] flex items-center justify-center text-xs font-bold text-[#9A968A]">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                    ) : (
                      username.charAt(0).toUpperCase()
                    )}
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`max-w-[75%] p-4 rounded-2xl ${
                  isMe 
                    ? 'bg-[#D4AF37] text-[#0B0B0C] rounded-tr-sm font-medium' 
                    : 'bg-[#1C1C1F] text-[#F2EFE6] rounded-tl-sm border border-[#2A2A2E]'
                }`}>
                  {/* Username above opponent's message */}
                  {!isMe && <p className="text-xs font-semibold mb-1 text-[#9A968A]">{username}</p>}
                  
                  {turn.image_url && (
                    <img src={turn.image_url} alt="Attachment" className="max-w-full rounded-lg mb-2 border border-black/20" />
                  )}
                  {turn.content !== "[Image sent]" && (
                    <p className="text-sm whitespace-pre-wrap">{turn.content}</p>
                  )}
                </div>

                {/* My Avatar */}
                {isMe && (
                  <div className="w-8 h-8 rounded-full overflow-hidden ml-2 flex-shrink-0 bg-[#2A2A2E] flex items-center justify-center text-xs font-bold text-[#9A968A]">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                    ) : (
                      username.charAt(0).toUpperCase()
                    )}
                  </div>
                )}
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Action Area */}
        <div className="p-4 border-t border-[#2A2A2E] bg-[#0B0B0C] rounded-b-xl flex flex-col gap-3">
          
          {/* DEBATE IN PROGRESS */}
          {debate.status === 'live' && (
            <>
              {/* Invite Judge Button */}
              {!debate.judge_id && (isPlayerA || isPlayerB) && (
                <div className="text-center p-2 text-[#D4AF37] bg-[#1C1C1F] rounded-xl border border-[#2A2A2E] flex justify-between items-center px-4">
                  <span className="text-sm">Want a human judge?</span>
                  <code className="text-xs bg-[#0B0B0C] p-1 rounded select-all">{currentUrl}?role=judge</code>
                </div>
              )}

              {/* If Player */}
              {(isPlayerA || isPlayerB) && (
                myDoneStatus ? (
                  <div className="text-center p-3 text-[#A3B18A] bg-[#A3B18A]/10 border border-[#A3B18A]/20 rounded-xl flex items-center justify-center gap-2"><CheckCircle size={18} /> You have finished. Waiting for opponent...</div>
                ) : canChat ? (
                  <div className="flex flex-col gap-2 w-full">
                    {imagePreview && (
                      <div className="relative inline-block w-32">
                        <img src={imagePreview} alt="Preview" className="rounded-lg border border-[#2A2A2E]" />
                        <button onClick={clearImage} className="absolute -top-2 -right-2 bg-[#BC4749] text-white rounded-full p-1 shadow-lg"><X size={14} /></button>
                      </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-[#1C1C1F] border border-[#2A2A2E] hover:border-[#D4AF37] text-[#9A968A] hover:text-[#D4AF37] px-4 rounded-xl flex items-center justify-center"><ImageIcon size={20} /></button>
                      <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your argument..." className="flex-1 bg-[#1C1C1F] text-[#F2EFE6] border border-[#2A2A2E] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4AF37]" disabled={isSubmitting || isUploading} />
                      <button type="submit" disabled={isSubmitting || isUploading || (!message.trim() && !selectedImage)} className="bg-[#D4AF37] hover:bg-[#E6C458] text-[#0B0B0C] px-6 rounded-xl flex items-center justify-center disabled:opacity-50">{isSubmitting || isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}</button>
                      <button type="button" onClick={handleDone} disabled={isSubmitting || isUploading} className="bg-transparent border-2 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B0B0C] font-bold px-6 rounded-xl transition-colors disabled:opacity-50">Done</button>
                    </form>
                  </div>
                ) : (
                  <div className="text-center p-3 text-[#9A968A] bg-[#1C1C1F] rounded-xl border border-[#2A2A2E] flex justify-between items-center">
                    <span>Debate is not active.</span>
                  </div>
                )
              )}

              {/* If Spectator or Judge */}
              {(!isPlayerA && !isPlayerB) && (
                <div className="text-center p-3 text-[#9A968A] bg-[#1C1C1F] rounded-xl border border-[#2A2A2E]">
                  You are observing this debate as {isJudge ? 'the Judge' : 'a spectator'}.
                </div>
              )}
            </>
          )}

          {/* JUDGING PHASE */}
          {debate.status === 'judging' && (
            isJudge ? (
              <form onSubmit={handleSubmitVerdict} className="bg-[#1C1C1F] p-6 rounded-xl border border-[#D4AF37] space-y-4">
                <h3 className="text-xl font-bold text-[#D4AF37] flex items-center gap-2"><Gavel /> Deliver Your Verdict</h3>
                <p className="text-sm text-[#9A968A]">The debate has ended. Please select the winner and provide your rationale.</p>
                
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setWinnerSelection('player_a')} className={`p-3 rounded-lg border text-center font-bold transition-all ${winnerSelection === 'player_a' ? 'bg-[#A3B18A] text-[#0B0B0C] border-[#A3B18A]' : 'bg-[#0B0B0C] text-[#9A968A] border-[#2A2A2E]'}`}>
                    {profiles[debate.player_a]?.username || topic?.side_a_label || 'Player A'}
                  </button>
                  <button type="button" onClick={() => setWinnerSelection('draw')} className={`p-3 rounded-lg border text-center font-bold transition-all ${winnerSelection === 'draw' ? 'bg-[#D4AF37] text-[#0B0B0C] border-[#D4AF37]' : 'bg-[#0B0B0C] text-[#9A968A] border-[#2A2A2E]'}`}>
                    Draw
                  </button>
                  <button type="button" onClick={() => setWinnerSelection('player_b')} className={`p-3 rounded-lg border text-center font-bold transition-all ${winnerSelection === 'player_b' ? 'bg-[#BC4749] text-[#F2EFE6] border-[#BC4749]' : 'bg-[#0B0B0C] text-[#9A968A] border-[#2A2A2E]'}`}>
                    {profiles[debate.player_b]?.username || topic?.side_b_label || 'Player B'}
                  </button>
                </div>

                <textarea 
                  value={judgeRationale} 
                  onChange={(e) => setJudgeRationale(e.target.value)}
                  placeholder="Explain why this side won..."
                  className="w-full bg-[#0B0B0C] text-[#F2EFE6] border border-[#2A2A2E] rounded-xl p-3 h-24 focus:outline-none focus:border-[#D4AF37]"
                  required
                />

                <button type="submit" disabled={isSubmittingVerdict || !judgeRationale.trim()} className="w-full bg-[#D4AF37] hover:bg-[#E6C458] text-[#0B0B0C] font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
                  {isSubmittingVerdict ? 'Submitting...' : 'Declare Winner'}
                </button>
              </form>
            ) : (
              <div className="text-center p-6 bg-[#1C1C1F] rounded-xl border border-[#D4AF37]/50 text-[#D4AF37] animate-pulse">
                The debate has ended. Waiting for the Human Judge to deliver their verdict...
              </div>
            )
          )}

        </div>
      </div>
    </div>
  )
}

export default function DebateRoom() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#F2EFE6] min-h-screen bg-[#0B0B0C]">Loading...</div>}>
      <DebateRoomContent />
    </Suspense>
  )
}