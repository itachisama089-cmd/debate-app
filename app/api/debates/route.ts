import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topic_id, stance } = await req.json() // 'pro' or 'con'
  
  if (!topic_id || !stance) {
    return NextResponse.json({ error: 'Topic ID and stance are required' }, { status: 400 })
  }

  // 1. Look for a waiting debate on this topic where the creator took the OPPOSITE stance
  const oppositeStance = stance === 'pro' ? 'con' : 'pro'
  
  const { data: existingDebate } = await supabase
    .from('debates')
    .select('*')
    .eq('topic_id', topic_id)
    .eq('status', 'waiting')
    .eq('stance_a', oppositeStance)
    .limit(1)
    .single()

  // 2. If we found one, JOIN it instantly
  if (existingDebate) {
    const deadline = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    
    const { data: joinedDebate, error } = await supabase.from('debates').update({
      player_b: user.id,
      status: 'live',
      current_turn: 1,
      deadline: deadline
    }).eq('id', existingDebate.id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(joinedDebate) // Return the existing room you just joined
  }

  // 3. If no one is waiting, CREATE a new room
  const { data: newDebate, error } = await supabase.from('debates').insert({
    topic_id,
    player_a: user.id,
    stance_a: stance, // Save your stance
    status: 'waiting'
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  
  return NextResponse.json(newDebate)
}