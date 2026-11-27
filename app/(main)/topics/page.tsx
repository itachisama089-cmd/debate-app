'use client'

import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Search, Plus, Swords, Lock, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const CATEGORIES = ['All', 'Non-Fiction', 'Fiction']

export default function TopicsPage() {
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Modals State
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false)
  const [isPrivateModalOpen, setIsPrivateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create Topic Form State
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Non-Fiction') 
  const [sideALabel, setSideALabel] = useState('Pro')
  const [sideBLabel, setSideBLabel] = useState('Con')
  
  // Image Upload State for Topic
  const [topicImage, setTopicImage] = useState<File | null>(null)
  const [topicImagePreview, setTopicImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Private Room Form State
  const [privateTopic, setPrivateTopic] = useState('')
  const [privateSideA, setPrivateSideA] = useState('Pro')
  const [privateSideB, setPrivateSideB] = useState('Con')
  const [privateStance, setPrivateStance] = useState<'pro' | 'con'>('pro')
  const [isCreatingPrivate, setIsCreatingPrivate] = useState(false)

  // NEW: State to handle the "Joining..." loading state on the buttons
  const [startingKey, setStartingKey] = useState<string | null>(null)

  async function fetchTopics() {
    const { data } = await supabase()
      .from('topics')
      .select('*, debates(count)')
      .eq('active', true)
      .order('created_at', { ascending: false })
    
    if (data) {
      const sorted = data.sort((a: any, b: any) => {
        const countA = a.debates?.[0]?.count || 0
        const countB = b.debates?.[0]?.count || 0
        return countB - countA
      })
      setTopics(sorted)
    }
    setLoading(false)
  }

  useEffect(() => { fetchTopics() }, [])

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || topic.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return alert("Image must be less than 5MB")
    setTopicImage(file)
    setTopicImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setTopicImage(null)
    setTopicImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory) return alert("Please select a category.")
    
    setIsSubmitting(true)
    let uploadedImageUrl = null

    try {
      if (topicImage) {
        setIsUploading(true)
        const fileExt = topicImage.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { error: uploadError } = await supabase().storage.from('topic-images').upload(fileName, topicImage)
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

        const { data: { publicUrl } } = supabase().storage.from('topic-images').getPublicUrl(fileName)
        uploadedImageUrl = publicUrl
        setIsUploading(false)
      }

      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newTitle, 
          category: newCategory, 
          sideALabel, 
          sideBLabel,
          image_url: uploadedImageUrl 
        })
      })

      if (res.ok) {
        setNewTitle('')
        setNewCategory('Non-Fiction')
        clearImage()
        await fetchTopics()
        setIsTopicModalOpen(false)
      }
    } catch (error: any) {
      alert(error.message)
      setIsUploading(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // UPDATED: Robust matchmaking function with loading state and error handling
  const handleStartDebate = async (topicId: string, stance: 'pro' | 'con') => {
    if (startingKey) return
    setStartingKey(`${topicId}-${stance}`)
    
    try {
      // Count the view in the background so it can never block the button
      supabase().rpc('increment_topic_view', { t_id: topicId }).then(() => {}, () => {})

      const res = await fetch('/api/debates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // FIXED: Sending "stance_a" instead of "stance" to match the API
        body: JSON.stringify({ topic_id: topicId, stance_a: stance })
      })
      
      const data = await res.json().catch(() => null)
      
      if (res.ok && data?.id) {
        router.push(`/debate/${data.id}`)
        return
      }
      alert(data?.error || 'Could not start the debate. Please try again.')
    } catch {
      alert('Network problem. Please check your connection and try again.')
    }
    
    setStartingKey(null)
  }

  const handleCreatePrivateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingPrivate(true)
    const res = await fetch('/api/debates/private', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        topic_title: privateTopic, category: 'Fiction', stance: privateStance, 
        sideALabel: privateSideA, sideBLabel: privateSideB 
      })
    })
    if (res.ok) {
      const debate = await res.json()
      router.push(`/debate/${debate.id}`)
    } else {
      setIsCreatingPrivate(false)
    }
  }
 
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto text-[var(--color-text)] min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-[var(--color-text)]">Topics</h1>
          <p className="text-[var(--color-text-muted)] mt-1">Pick a side and start a parley.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="secondary" onClick={() => setIsPrivateModalOpen(true)} className="flex-1 md:flex-none flex items-center gap-2">
            <Lock size={18} /> Private Room
          </Button>
          <Button onClick={() => setIsTopicModalOpen(true)} className="flex-1 md:flex-none flex items-center gap-2">
            <Plus size={18} /> New Topic
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4 mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 text-[var(--color-text-muted)]" size={20} />
          <input
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-full py-2.5 pl-10 pr-4 focus:outline-none focus:border-[var(--color-gold)] transition-colors"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                selectedCategory === cat 
                  ? 'bg-[var(--color-gold)] text-[var(--color-bg)] border-[var(--color-gold)]' 
                  : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-[var(--color-surface)] rounded-xl animate-pulse border border-[var(--color-border)]" />
          ))}
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[var(--color-border)] rounded-2xl">
          <p className="text-[var(--color-text-muted)] text-lg">No topics found matching your search.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTopics.map((topic) => {
            const debateCount = topic.debates?.[0]?.count || 0
            return (
              <div key={topic.id} className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden flex flex-col hover:border-[var(--color-gold)]/50 transition-colors group">
                
                {/* Topic Image */}
                {topic.image_url ? (
                  <div className="h-40 w-full overflow-hidden relative border-b border-[var(--color-border)]">
                    <img src={topic.image_url} alt={topic.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
                        {topic.category || 'General'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 pb-0 flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] px-2 py-1 rounded-md">
                      {topic.category || 'General'}
                    </span>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text)] font-serif leading-tight group-hover:text-[var(--color-gold)] transition-colors mb-3">
                      {topic.title}
                    </h3>
                    <div className="flex items-center gap-1 text-[var(--color-text-muted)] text-xs" title="Times debated">
                      <Swords size={14} />
                      <span>{debateCount} parleys</span>
                    </div>
                  </div>
                </div>

                {/* Face-off Buttons */}
                <div className="flex border-t border-[var(--color-border)] h-14">
                  <button 
                    disabled={startingKey !== null}
                    onClick={() => handleStartDebate(topic.id, 'pro')} 
                    className="disabled:opacity-50 disabled:cursor-not-allowed flex-1 flex items-center justify-center bg-[var(--color-pro)]/10 hover:bg-[var(--color-pro)]/20 text-[var(--color-pro)] font-bold text-sm border-r border-[var(--color-border)] transition-colors"
                  >
                    {startingKey === `${topic.id}-pro` ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      topic.side_a_label || 'Pro'
                    )}
                  </button>
                  
                  <button 
                    disabled={startingKey !== null}
                    onClick={() => handleStartDebate(topic.id, 'con')} 
                    className="disabled:opacity-50 disabled:cursor-not-allowed flex-1 flex items-center justify-center bg-[var(--color-con)]/10 hover:bg-[var(--color-con)]/20 text-[var(--color-con)] font-bold text-sm transition-colors"
                  >
                    {startingKey === `${topic.id}-con` ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      topic.side_b_label || 'Con'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* --- NEW TOPIC MODAL --- */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] w-full max-w-md rounded-2xl border border-[var(--color-border)] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsTopicModalOpen(false)} className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-serif font-bold text-[var(--color-text)] mb-1">Create a Topic</h2>
            <p className="text-[var(--color-text-muted)] text-sm mb-6">Propose a new debate to the public.</p>

            <form onSubmit={handleCreateTopic} className="space-y-4">
              
              {/* Image Upload */}
              <div>
                <label className="text-xs text-[var(--color-text-muted)] font-bold uppercase mb-1 block">Topic Cover Image (Optional)</label>
                {topicImagePreview ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-[var(--color-border)]">
                    <img src={topicImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={clearImage} className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full hover:bg-[var(--color-con)] transition-colors"><X size={16} /></button>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-[var(--color-border)] rounded-lg flex flex-col items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-colors bg-[var(--color-surface-raised)]"
                  >
                    <ImageIcon size={24} className="mb-2" />
                    <span className="text-xs font-medium">Click to upload image</span>
                  </button>
                )}
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-muted)] font-bold uppercase mb-1 block">Topic Title</label>
                <input 
                  type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Should college be free?" required
                  className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg p-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-gold)]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] font-bold uppercase mb-1 block">Side A</label>
                  <input type="text" value={sideALabel} onChange={(e) => setSideALabel(e.target.value)} className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg p-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-gold)]" required />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] font-bold uppercase mb-1 block">Side B</label>
                  <input type="text" value={sideBLabel} onChange={(e) => setSideBLabel(e.target.value)} className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg p-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-gold)]" required />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-muted)] font-bold uppercase mb-1 block">Category (Required)</label>
                <select 
                  value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg p-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-gold)]"
                >
                  <option value="Non-Fiction">Non-Fiction</option>
                  <option value="Fiction">Fiction</option>
                </select>
              </div>

              <Button type="submit" disabled={isSubmitting || isUploading} className="w-full mt-2" size="lg">
                {isSubmitting || isUploading ? <Loader2 className="animate-spin" size={20} /> : 'Publish Topic'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* --- PRIVATE ROOM MODAL --- */}
      {isPrivateModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] w-full max-w-md rounded-2xl border border-[var(--color-border)] p-6 shadow-2xl relative">
            <button onClick={() => setIsPrivateModalOpen(false)} className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-serif font-bold text-[var(--color-text)] mb-1 flex items-center gap-2">
              <Lock className="text-[var(--color-gold)]" size={24} /> Private Parley
            </h2>
            <p className="text-[var(--color-text-muted)] text-sm mb-6">Invite a friend to a private debate.</p>

            <form onSubmit={handleCreatePrivateRoom} className="space-y-4">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] font-bold uppercase mb-1 block">Topic</label>
                <input type="text" value={privateTopic} onChange={(e) => setPrivateTopic(e.target.value)} placeholder="e.g. Messi vs Ronaldo" required className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg p-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-gold)]" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] font-bold uppercase mb-1 block">Side A</label>
                  <input type="text" value={privateSideA} onChange={(e) => setPrivateSideA(e.target.value)} className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg p-3 text-[var(--color-text)] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] font-bold uppercase mb-1 block">Side B</label>
                  <input type="text" value={privateSideB} onChange={(e) => setPrivateSideB(e.target.value)} className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg p-3 text-[var(--color-text)] focus:outline-none" required />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-muted)] font-bold uppercase mb-1 block">Your Side</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPrivateStance('pro')} className={`flex-1 py-3 rounded-lg font-bold transition-all border ${privateStance === 'pro' ? 'bg-[var(--color-pro)]/20 text-[var(--color-pro)] border-[var(--color-pro)]' : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-transparent'}`}>{privateSideA}</button>
                  <button type="button" onClick={() => setPrivateStance('con')} className={`flex-1 py-3 rounded-lg font-bold transition-all border ${privateStance === 'con' ? 'bg-[var(--color-con)]/20 text-[var(--color-con)] border-[var(--color-con)]' : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-transparent'}`}>{privateSideB}</button>
                </div>
              </div>

              <Button type="submit" disabled={isCreatingPrivate} className="w-full mt-2" size="lg">
                {isCreatingPrivate ? <Loader2 className="animate-spin" size={20} /> : 'Create Private Room'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}