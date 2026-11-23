'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

export default function TopicsPage() {
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('General')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function fetchTopics() {
    const { data } = await supabase().from('topics').select('*').eq('active', true).order('created_at', { ascending: false })
    if (data) setTopics(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchTopics()
  }, [])

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const res = await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, category: newCategory })
    })

    if (res.ok) {
      setNewTitle('') // clear form
      await fetchTopics() // refresh list
    } else {
      alert('Failed to create topic')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold">Debate Topics</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline font-medium">
            Back to Dashboard
          </Link>
        </div>

        {/* Create Topic Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-bold mb-4">Post a New Topic</h2>
          <form onSubmit={handleCreateTopic} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="What should we debate?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-grow border p-2 rounded-lg"
              required
            />
            <select 
              value={newCategory} 
              onChange={(e) => setNewCategory(e.target.value)}
              className="border p-2 rounded-lg bg-white"
            >
              <option value="General">General</option>
              <option value="Technology">Technology</option>
              <option value="Politics">Politics</option>
              <option value="Philosophy">Philosophy</option>
              <option value="Pop Culture">Pop Culture</option>
            </select>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Post Topic'}
            </button>
          </form>
        </div>

        {/* Topics Grid */}
        {loading ? (
          <p className="text-gray-500 animate-pulse">Loading topics...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {topics.map((topic) => (
              <div key={topic.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-full mb-3 inline-block">
                    {topic.category || 'General'}
                  </span>
                  <h2 className="text-xl font-bold mb-2">{topic.title}</h2>
                  {topic.creator_id && (
                    <p className="text-sm text-gray-500 mb-4">Community Topic</p>
                  )}
                </div>
                <button className="bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg w-full transition-colors mt-4">
                  Start Debate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}