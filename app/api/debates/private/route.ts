import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topic_title, category, stance } = await req.json()
  
  if (!topic_title || !stance) {
    return NextResponse.json({ error: 'Topic and stance are required' }, { status: 400 })
  }

  // 1. Create the custom topic in the database
  const { data: newTopic, error: topicError } = await supabase.from('topics').insert({
    title: topic_title,
    category: category || 'Custom',
    creator_id: user.id,
    is_custom: true
  }).select().single()

  if (topicError) return NextResponse.json({ error: topicError.message }, { status: 400 })

  // 2. Create the private debate room
  const { data: newDebate, error: debateError } = await supabase.from('debates').insert({
    topic_id: newTopic.id,
    player_a: user.id,
    stance_a: stance,
    status: 'waiting',
    is_private: true // Mark it as private!
  }).select().single()

  if (debateError) return NextResponse.json({ error: debateError.message }, { status: 400 })
  
  return NextResponse.json(newDebate)
}