'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Flame, Swords, Eye, Send, Lock, X } from 'lucide-react'

export default function TopicsPage() {
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('General')
  const [sideALabel, setSideALabel] = useState('Pro')
  const [sideBLabel, setSideBLabel] = useState('Con')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startingKey, setStartingKey] = useState<string | null>(null)

  // Modal State
  const [isPrivateModalOpen, setIsPrivateModalOpen] = useState(false)
  const [privateTopic, setPrivateTopic] = useState('')
  const [privateSideA, setPrivateSideA] = useState('Pro')
  const [privateSideB, setPrivateSideB] = useState('Con')
  const [privateStance, setPrivateStance] = useState<'pro' | 'con'>('pro')
  const [isCreatingPrivate, setIsCreatingPrivate] = useState(false)

  const router = useRouter()

  async function fetchTopics() {
    // Fetch topics AND count how many debates exist for each topic
    const { data, error } = await supabase()
      .from('topics')
      .select('*, debates(count)')
      .eq('active', true)

    if (error) {
      console.error(error)
    } else if (data) {
      // Sort the data by the number of debates (Trending logic)
      const sortedTopics = data.sort((a: any, b: any) => {
        const countA = a.debates?.[0]?.count || 0
        const countB = b.debates?.[0]?.count || 0
        return countB - countA // Descending order (Highest debates first)
      })
      setTopics(sortedTopics)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTopics()
  }, [])

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, category: newCategory, sideALabel, sideBLabel })
      })
      if (res.ok) {
        setNewTitle('')
        await fetchTopics()
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.error || 'Could not post the topic. Please try again.')
      }
    } catch {
      alert('Network problem. Please check your connection and try again.')
    }
    setIsSubmitting(false)
  }

  const handleStartDebate = async (topicId: string, stance: 'pro' | 'con') => {
    if (startingKey) return
    setStartingKey(`${topicId}-${stance}`)

    try {
      // Count the view in the background so it can never block the button
      supabase().rpc('increment_topic_view', { t_id: topicId }).then(() => {}, () => {})

      // Start (or join) the debate. The API expects "stance_a".
      const res = await fetch('/api/debates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        topic_title: privateTopic,
        category: 'Custom',
        stance: privateStance,
        sideALabel: privateSideA,
        sideBLabel: privateSideB
      })
    })

    if (res.ok) {
      const debate = await res.json()
      router.push(`/debate/${debate.id}`)
    } else {
      alert('Failed to create private room')
      setIsCreatingPrivate(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto text-[#F2EFE6] bg-[#0B0B0C] min-h-screen relative">
      {/* Hero */}
      <div className="relative w-full h-48 md:h-64 rounded-3xl overflow-hidden mb-8 border border-[#2A2A2E]">
        <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop" alt="Auditorium" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0C] via-[#0B0B0C]/80 to-transparent" />
        <div className="relative z-10 p-6 md:p-10 h-full flex flex-col justify-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome to <span className="text-[#D4AF37]">Parley!</span></h1>
          <p className="text-sm md:text-base text-[#9A968A]">Share your thoughts. Spark discussions. Find new perspectives.</p>
        </div>
      </div>

      {/* Composer */}
      <div className="bg-[#141416] p-4 rounded-2xl border border-[#2A2A2E] mb-6 flex flex-col gap-4">
        <form onSubmit={handleCreateTopic} className="flex flex-col gap-4">

          {/* Topic Title & Category */}
          <div className="flex flex-col md:flex-row gap-2 w-full">
            <input
              type="text"
              placeholder="What should we debate?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 bg-[#1C1C1F] text-[#F2EFE6] placeholder-[#9A968A] px-4 py-3 border border-[#2A2A2E] rounded-xl focus:outline-none focus:border-[#D4AF37]"
              required
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="bg-[#1C1C1F] text-[#9A968A] px-4 py-3 rounded-xl focus:outline-none border border-[#2A2A2E] cursor-pointer"
            >
              <option value="General">General</option>
              <option value="Technology">Technology</option>
              <option value="Politics">Politics</option>
            </select>
          </div>

          {/* Sides & Post Button */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <span className="text-sm text-[#9A968A] font-medium hidden md:block">Sides:</span>
            <input
              type="text"
              placeholder="Side A (e.g., Yes)"
              value={sideALabel}
              onChange={(e) => setSideALabel(e.target.value)}
              className="flex-1 bg-[#1C1C1F] text-[#F2EFE6] placeholder-[#9A968A] px-3 py-2 border border-[#2A2A2E] rounded-lg focus:outline-none"
              required
            />
            <span className="text-[#9A968A] text-center font-bold hidden md:block">vs</span>
            <input
              type="text"
              placeholder="Side B (e.g., No)"
              value={sideBLabel}
              onChange={(e) => setSideBLabel(e.target.value)}
              className="flex-1 bg-[#1C1C1F] text-[#F2EFE6] placeholder-[#9A968A] px-3 py-2 border border-[#2A2A2E] rounded-lg focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#D4AF37] to-[#A8841F] hover:from-[#E6C458] hover:to-[#D4AF37] text-[#0B0B0C] font-bold px-6 py-3 md:py-2 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 md:mt-0"
            >
              <Send size={18} /> {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {/* Private Room Button */}
      <div className="flex justify-end mb-8">
        <button onClick={() => setIsPrivateModalOpen(true)} className="w-full md:w-auto bg-[#141416] hover:bg-[#1C1C1F] border border-[#D4AF37] text-[#D4AF37] font-medium px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
          <Lock size={18} /> Create Private Room
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Flame className="text-[#D4AF37]" size={24} />
        <h2 className="text-2xl font-bold">Trending Topics</h2>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-[#9A968A] animate-pulse">Loading topics...</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => {
            // Extract the real debate count
            const debateCount = topic.debates?.[0]?.count || 0

            return (
              <div key={topic.id} className="bg-[#141416] rounded-2xl overflow-hidden border border-[#2A2A2E] hover:border-[#D4AF37] transition-all group flex flex-col">
                <div className="h-32 bg-gradient-to-br from-[#1C1C1F] to-[#141416] p-4 flex items-end relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                  <span className="relative z-10 bg-[#0B0B0C] text-[#D4AF37] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-[#2A2A2E]">
                    {topic.category || 'General'}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <h3 className="text-lg font-bold text-[#F2EFE6] mb-4 group-hover:text-[#D4AF37] transition-colors line-clamp-2">
                    {topic.title}
                  </h3>

                  <div className="flex gap-2 mt-2">
                    <button
                      disabled={startingKey !== null}
                      onClick={() => handleStartDebate(topic.id, 'pro')}
                      className="flex-1 bg-[#A3B18A] hover:bg-[#8C9A75] text-[#0B0B0C] font-bold py-2 px-2 rounded-lg transition-colors text-sm truncate disabled:opacity-50"
                    >
                      {startingKey === `${topic.id}-pro` ? 'Joining...' : (topic.side_a_label || 'Pro')}
                    </button>
                    <button
                      disabled={startingKey !== null}
                      onClick={() => handleStartDebate(topic.id, 'con')}
                      className="flex-1 bg-[#BC4749] hover:bg-[#A33E40] text-[#F2EFE6] font-bold py-2 px-2 rounded-lg transition-colors text-sm truncate disabled:opacity-50"
                    >
                      {startingKey === `${topic.id}-con` ? 'Joining...' : (topic.side_b_label || 'Con')}
                    </button>
                  </div>

                  {/* REAL STATS */}
                  <div className="flex items-center justify-between text-sm text-[#9A968A] mt-4 border-t border-[#2A2A2E] pt-4">
                    <div className="flex items-center gap-1" title="Times debated">
                      <Swords size={16} />
                      <span>{debateCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#D4AF37]" title="Views">
                      <Eye size={16} />
                      <span>{topic.views || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PRIVATE ROOM MODAL */}
      {isPrivateModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141416] w-full max-w-md rounded-2xl border border-[#2A2A2E] p-6 shadow-2xl relative">
            <button onClick={() => setIsPrivateModalOpen(false)} className="absolute top-4 right-4 text-[#9A968A] hover:text-white">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold text-[#F2EFE6] mb-2 flex items-center gap-2">
              <Lock className="text-[#D4AF37]" /> Private Debate
            </h2>
            <p className="text-[#9A968A] text-sm mb-6">Create a custom room and invite a friend to debate.</p>

            <form onSubmit={handleCreatePrivateRoom} className="space-y-4">
              <div>
                <label className="text-xs text-[#9A968A] font-bold uppercase mb-1 block">Topic</label>
                <input
                  type="text"
                  value={privateTopic}
                  onChange={(e) => setPrivateTopic(e.target.value)}
                  placeholder="e.g. Messi vs Ronaldo"
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-3 text-[#F2EFE6] focus:outline-none focus:border-[#D4AF37]"
                  required
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-xs text-[#9A968A] font-bold uppercase mb-1 block">Side A</label>
                  <input
                    type="text"
                    value={privateSideA}
                    onChange={(e) => setPrivateSideA(e.target.value)}
                    className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-3 text-[#F2EFE6] focus:outline-none focus:border-[#D4AF37]"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-[#9A968A] font-bold uppercase mb-1 block">Side B</label>
                  <input
                    type="text"
                    value={privateSideB}
                    onChange={(e) => setPrivateSideB(e.target.value)}
                    className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-3 text-[#F2EFE6] focus:outline-none focus:border-[#D4AF37]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#9A968A] font-bold uppercase mb-1 block">Choose your side</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPrivateStance('pro')}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${privateStance === 'pro' ? 'bg-[#A3B18A] text-[#0B0B0C]' : 'bg-[#1C1C1F] text-[#9A968A] border border-[#2A2A2E]'}`}
                  >
                    I am {privateSideA}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrivateStance('con')}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${privateStance === 'con' ? 'bg-[#BC4749] text-[#F2EFE6]' : 'bg-[#1C1C1F] text-[#9A968A] border border-[#2A2A2E]'}`}
                  >
                    I am {privateSideB}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingPrivate}
                className="w-full mt-4 bg-gradient-to-r from-[#D4AF37] to-[#A8841F] hover:from-[#E6C458] hover:to-[#D4AF37] text-[#0B0B0C] font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {isCreatingPrivate ? 'Creating Room...' : 'Create Room'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}