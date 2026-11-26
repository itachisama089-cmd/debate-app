'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Send, Scale, Clock, CheckCircle, Loader2, Image as ImageIcon, X, Gavel, UserCheck, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'

function DebateRoomContent() {
  const params = useParams()
  const debateId = params.id as string
  const router = useRouter()
  const searchParams = useSearchParams()
  const isJudgeInvite = searchParams.get('role') === 'judge'
  
  const [debate, setDebate] = useState<any>(null)
  const [topic, setTopic] = useState<any>(null)
  const [turns, setTurns] = useState<any[]>([])
  const [judgment, setJudgment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [currentUrl, setCurrentUrl] = useState('')
  const [timeLeft, setTimeLeft] = useState<string>('')
  
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  
  // Chat State
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Human Judge State
  const [isSubmittingVerdict, setIsSubmittingVerdict] = useState(false)
  const [winnerSelection, setWinnerSelection] = useState<'player_a' | 'player_b' | 'draw'>('player_a')
  const [judgeRationale, setJudgeRationale] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  async function fetchDebate() {
    const { data: { user } } = await supabase().auth.getUser()
    if (user) setUserId(user.id)

    const { data: debateData } = await supabase().from('debates').select('*, topics(title, side_a_label, side_b_label)').eq('id', debateId).single()
    if (debateData) { setDebate(debateData); setTopic(debateData.topics) }

    const { data: turnsData } = await supabase().from('turns').select('*').eq('debate_id', debateId).order('created_at', { ascending: true })
    if (turnsData) setTurns(turnsData)

    const { data: judgeData } = await supabase().from('judgments').select('*').eq('debate_id', debateId).single()
    if (judgeData) setJudgment(judgeData)

    setLoading(false)
  }

  useEffect(() => {
    fetchDebate()
    setCurrentUrl(window.location.href.split('?')[0]) 

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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    alert(`${label} link copied to clipboard!`)
  }

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

      const res = await fetch(`/api/debates/${debateId}/turns`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          content: message || "[Image sent]", 
          image_url: uploadedImageUrl
        }) 
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

  // NEW: Handle leaving the room safely
  const handleLeave = async () => {
    // If the debate hasn't started yet, mark it as abandoned
    if (debate?.status === 'waiting') {
      await fetch(`/api/debates/${debateId}/leave`, { method: 'POST' })
    }
    router.push('/topics')
  }

  if (loading) return <div className="p-8 text-center text-[var(--color-text)] min-h-screen bg-[var(--color-bg)]">Loading room...</div>
  if (!debate) return <div className="p-8 text-center text-[var(--color-con)] min-h-screen bg-[var(--color-bg)]">Debate not found.</div>

  const isPlayerA = userId === debate.player_a
  const isPlayerB = userId === debate.player_b
  const isJudge = userId === debate.judge_id
  const isSpectator = !isPlayerA && !isPlayerB && !isJudge

  const myDoneStatus = isPlayerA ? debate.player_a_done : debate.player_b_done
  const canChat = debate.status === 'live' && !myDoneStatus
  
  const myStance = isPlayerA ? debate.stance_a : (debate.stance_a === 'pro' ? 'con' : 'pro')
  const myStanceLabel = myStance === 'pro' ? (topic?.side_a_label || 'Pro') : (topic?.side_b_label || 'Con')
  
  const myColorClass = myStance === 'pro' 
    ? 'text-[var(--color-pro)] bg-[var(--color-pro)]/20 border-[var(--color-pro)]/30' 
    : 'text-[var(--color-con)] bg-[var(--color-con)]/20 border-[var(--color-con)]/30'

  // 1. WAITING ROOM
  if (debate.status === 'waiting') {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] p-8 flex flex-col items-center justify-center text-[var(--color-text)]">
        <div className="max-w-2xl w-full bg-[var(--color-surface)] p-10 rounded-xl border border-[var(--color-border)] text-center">
          <h1 className="text-3xl font-serif font-extrabold mb-3 text-[var(--color-text)]">Topic: {topic?.title}</h1>
          {!isSpectator && <p className="text-[var(--color-text-muted)] mb-8">You are arguing <span className={`font-bold px-2 py-1 rounded-md border ${myColorClass}`}>{myStanceLabel}</span></p>}
          
          {isSpectator && isJudgeInvite ? (
             <div className="bg-[var(--color-bg)] p-6 rounded-lg border border-[var(--color-gold)] mb-8">
                <Gavel className="mx-auto text-[var(--color-gold)] mb-4" size={48} />
                <p className="text-lg font-medium mb-4 text-[var(--color-gold)]">You have been invited to Judge!</p>
                <Button onClick={handleBecomeJudge}>Accept Judge Role</Button>
             </div>
          ) : debate.is_private ? (
            isPlayerA ? (
              <div className="bg-[var(--color-bg)] p-6 rounded-lg border border-[var(--color-gold)] mb-8 w-full">
                <p className="text-lg font-medium mb-4 text-[var(--color-gold)]">Waiting for opponent...</p>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <code className="block bg-[var(--color-surface-raised)] p-3 rounded-lg text-sm text-[var(--color-text)] w-full truncate border border-[var(--color-border)]">
                    {currentUrl}
                  </code>
                  <Button onClick={() => copyToClipboard(currentUrl, "Opponent invite")} className="w-full sm:w-auto flex gap-2">
                    <Copy size={18} /> Copy Link
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--color-bg)] p-6 rounded-lg border border-[var(--color-gold)] mb-8">
                <p className="text-lg font-medium mb-4 text-[var(--color-gold)]">You have been invited to a private debate!</p>
                <Button onClick={handleJoin}>Join Debate</Button>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center mb-8 bg-[var(--color-bg)] p-6 rounded-lg border border-[var(--color-border)]">
              <Loader2 className="text-[var(--color-gold)] animate-spin mb-4" size={48} />
              <p className="text-lg font-medium text-[var(--color-gold)]">Finding an Opponent...</p>
            </div>
          )}
          {/* UPDATED: Use handleLeave to clean up the room */}
          <button onClick={handleLeave} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors py-3">Leave</button>
        </div>
      </div>
    )
  }

  // 2. VERDICT SCREEN
  if (debate.status === 'completed' && judgment) {
    const iWon = (isPlayerA && judgment.winner_id === debate.player_a) || (isPlayerB && judgment.winner_id === debate.player_b)
    const isDraw = judgment.winner_id === null
    
    return (
      <div className="min-h-screen bg-[var(--color-bg)] p-8 flex flex-col items-center justify-center text-[var(--color-text)]">
        <div className="max-w-2xl w-full bg-[var(--color-surface)] p-8 rounded-xl border border-[var(--color-border)] shadow-2xl">
          <div className="text-center mb-8">
            <Scale className="mx-auto text-[var(--color-gold)] mb-4" size={48} />
            <h1 className="text-3xl font-serif font-extrabold mb-2">Debate Concluded</h1>
            <p className="text-[var(--color-text-muted)]">Judged by: {judgment.judge_type === 'human' ? 'Third Party' : 'AI'}</p>
          </div>
          <div className={`p-6 rounded-xl text-center mb-8 border ${isDraw ? 'bg-[var(--color-surface-raised)] border-[var(--color-border)]' : iWon ? 'bg-[var(--color-pro)]/10 border-[var(--color-pro)]/50' : 'bg-[var(--color-con)]/10 border-[var(--color-con)]/50'}`}>
            <h2 className={`text-2xl font-bold mb-2 ${isDraw ? 'text-[var(--color-text)]' : iWon ? 'text-[var(--color-pro)]' : 'text-[var(--color-con)]'}`}>
              {isDraw ? "It's a Draw / Void!" : iWon ? "You Won! 🏆" : "You Lost"}
            </h2>
            <p className="text-[var(--color-text)] text-sm whitespace-pre-wrap">{judgment.rationale}</p>
          </div>
          <Button onClick={() => router.push('/topics')} className="w-full">Back to Topics</Button>
        </div>
      </div>
    )
  }

  // 3. LIVE CHAT / JUDGING SCREEN
  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-2 sm:p-4 md:p-8 flex flex-col items-center overflow-hidden">
      <div className="max-w-4xl w-full bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex flex-col h-[90vh] md:h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-[var(--color-bg)] rounded-t-xl">
          <div>
            <div className="flex items-center gap-4">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${debate.status === 'live' ? 'text-[var(--color-pro)] bg-[var(--color-pro)]/10' : 'text-[var(--color-gold)] bg-[var(--color-gold)]/10'}`}>
                {debate.status === 'judging' ? 'Awaiting Verdict' : debate.status}
              </span>
              {debate.status === 'live' && (
                <span className="flex items-center gap-1 text-sm text-[var(--color-gold)] font-mono bg-[var(--color-surface-raised)] px-3 py-1 rounded-full border border-[var(--color-border)]"><Clock size={14} /> {timeLeft}</span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-extrabold text-[var(--color-text)] mt-2">Topic: {topic?.title}</h1>
          </div>
          <div className="text-right">
            {isJudge && <span className="flex items-center gap-1 text-[var(--color-gold)] font-bold text-sm bg-[var(--color-gold)]/10 px-3 py-1 rounded-full mb-2"><Gavel size={14} /> You are the Judge</span>}
            {!isJudge && debate.judge_id && <span className="flex items-center gap-1 text-[var(--color-text-muted)] text-sm mb-2"><UserCheck size={14} /> Human Judge Assigned</span>}
            <button onClick={() => router.push('/topics')} className="block text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm ml-auto">Leave Room</button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {turns.map((turn) => {
            const isMe = turn.user_id === userId
            const profile = profiles[turn.user_id]
            
            const username = profile?.username || (turn.user_id === debate.player_a ? (topic?.side_a_label || 'Player A') : (topic?.side_b_label || 'Player B'))
            const avatarUrl = profile?.avatar_url

            return (
              <div key={turn.id} className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0 bg-[var(--color-surface-raised)] flex items-center justify-center text-xs font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                    {avatarUrl ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" /> : username.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  isMe 
                    ? 'bg-[var(--color-gold)] text-[var(--color-bg)] rounded-tr-sm font-medium' 
                    : 'bg-[var(--color-surface-raised)] text-[var(--color-text)] rounded-tl-sm border border-[var(--color-border)]'
                }`}>
                  {!isMe && <p className="text-xs font-semibold mb-1 opacity-70">{username}</p>}
                  
                  {turn.image_url && (
                    <img src={turn.image_url} alt="Attachment" className="max-w-full rounded-lg mb-2 border border-black/20" />
                  )}
                  {turn.content !== "[Image sent]" && (
                    <p className="text-sm whitespace-pre-wrap">{turn.content}</p>
                  )}
                </div>

                {isMe && (
                  <div className="w-8 h-8 rounded-full overflow-hidden ml-2 flex-shrink-0 bg-[var(--color-surface-raised)] flex items-center justify-center text-xs font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                    {avatarUrl ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" /> : username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Action Area */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg)] rounded-b-xl flex flex-col gap-3">
          
          {debate.status === 'live' && (
            <>
              {!debate.judge_id && (isPlayerA || isPlayerB) && (
                <div className="p-3 text-[var(--color-gold)] bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-center gap-2 w-full overflow-hidden">
                  <span className="text-sm whitespace-nowrap font-bold">Invite a Human Judge:</span>
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <code className="text-xs bg-[var(--color-bg)] p-2 rounded border border-[var(--color-border)] w-full sm:max-w-[200px] truncate text-[var(--color-text-muted)]">
                      {currentUrl}?role=judge
                    </code>
                    <Button size="sm" onClick={() => copyToClipboard(`${currentUrl}?role=judge`, "Judge invite")} className="w-full sm:w-auto flex items-center gap-2">
                      <Copy size={16} /> Copy Link
                    </Button>
                  </div>
                </div>
              )}

              {(isPlayerA || isPlayerB) && (
                myDoneStatus ? (
                  <div className="text-center p-3 text-[var(--color-pro)] bg-[var(--color-pro)]/10 border border-[var(--color-pro)]/20 rounded-xl flex items-center justify-center gap-2 font-medium">
                    <CheckCircle size={18} /> You have finished. Waiting for opponent...
                  </div>
                ) : canChat ? (
                  <div className="flex flex-col gap-2 w-full">
                    {imagePreview && (
                      <div className="relative inline-block w-32">
                        <img src={imagePreview} alt="Preview" className="rounded-lg border border-[var(--color-border)]" />
                        <button onClick={clearImage} className="absolute -top-2 -right-2 bg-[var(--color-con)] text-white rounded-full p-1 shadow-lg"><X size={14} /></button>
                      </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex gap-2 w-full">
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] hover:border-[var(--color-gold)] text-[var(--color-text-muted)] hover:text-[var(--color-gold)] px-3 sm:px-4 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                        <ImageIcon size={20} />
                      </button>
                      
                      <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your argument..." className="flex-1 min-w-0 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] rounded-xl px-3 sm:px-4 py-3 focus:outline-none focus:border-[var(--color-gold)]" disabled={isSubmitting || isUploading} />
                      
                      <button type="submit" disabled={isSubmitting || isUploading || (!message.trim() && !selectedImage)} className="bg-[var(--color-gold)] hover:bg-[var(--color-gold-hover)] text-[var(--color-bg)] px-3 sm:px-6 rounded-xl flex items-center justify-center disabled:opacity-50 shrink-0 transition-colors">
                        {isSubmitting || isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                      </button>
                      <button type="button" onClick={handleDone} disabled={isSubmitting || isUploading} className="bg-transparent border-2 border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-[var(--color-bg)] font-bold px-3 sm:px-6 rounded-xl transition-colors disabled:opacity-50 shrink-0">
                        Done
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="text-center p-3 text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border)]">
                    <span>Debate is not active.</span>
                  </div>
                )
              )}

              {(!isPlayerA && !isPlayerB) && (
                <div className="text-center p-3 text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border)]">
                  You are observing this debate as {isJudge ? 'the Judge' : 'a spectator'}.
                </div>
              )}
            </>
          )}

          {debate.status === 'judging' && (
            isJudge ? (
              <form onSubmit={handleSubmitVerdict} className="bg-[var(--color-surface-raised)] p-6 rounded-xl border border-[var(--color-gold)] space-y-4">
                <h3 className="text-xl font-bold text-[var(--color-gold)] flex items-center gap-2"><Gavel /> Deliver Your Verdict</h3>
                <p className="text-sm text-[var(--color-text-muted)]">The debate has ended. Please select the winner and provide your rationale.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button type="button" onClick={() => setWinnerSelection('player_a')} className={`p-3 rounded-lg border text-center font-bold transition-all ${winnerSelection === 'player_a' ? 'bg-[var(--color-pro)] text-[var(--color-bg)] border-[var(--color-pro)]' : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)]'}`}>
                    {profiles[debate.player_a]?.username || topic?.side_a_label || 'Player A'}
                  </button>
                  <button type="button" onClick={() => setWinnerSelection('draw')} className={`p-3 rounded-lg border text-center font-bold transition-all ${winnerSelection === 'draw' ? 'bg-[var(--color-gold)] text-[var(--color-bg)] border-[var(--color-gold)]' : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)]'}`}>
                    Draw
                  </button>
                  <button type="button" onClick={() => setWinnerSelection('player_b')} className={`p-3 rounded-lg border text-center font-bold transition-all ${winnerSelection === 'player_b' ? 'bg-[var(--color-con)] text-[var(--color-text)] border-[var(--color-con)]' : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)]'}`}>
                    {profiles[debate.player_b]?.username || topic?.side_b_label || 'Player B'}
                  </button>
                </div>

                <textarea 
                  value={judgeRationale} 
                  onChange={(e) => setJudgeRationale(e.target.value)}
                  placeholder="Explain why this side won..."
                  className="w-full bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] rounded-xl p-3 h-24 focus:outline-none focus:border-[var(--color-gold)]"
                  required
                />

                <Button type="submit" disabled={isSubmittingVerdict || !judgeRationale.trim()} className="w-full">
                  {isSubmittingVerdict ? 'Submitting...' : 'Declare Winner'}
                </Button>
              </form>
            ) : (
              <div className="text-center p-6 bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-gold)]/50 text-[var(--color-gold)] flex flex-col items-center gap-4">
                <p>The debate has ended. Waiting for the Human Judge to deliver their verdict...</p>
                
                {(isPlayerA || isPlayerB) && (
                  <Button 
                    variant="secondary"
                    onClick={async () => {
                      if(window.confirm("Is the judge missing? Click OK to kick them and have the AI judge instead.")) {
                        await fetch(`/api/debates/${debateId}/force-judge`, { method: 'POST' })
                      }
                    }}
                  >
                    Force AI Judging
                  </Button>
                )}
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
    <Suspense fallback={<div className="p-8 text-center text-[var(--color-text)] min-h-screen bg-[var(--color-bg)]">Loading...</div>}>
      <DebateRoomContent />
    </Suspense>
  )
}