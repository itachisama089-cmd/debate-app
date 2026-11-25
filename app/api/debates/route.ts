import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createServerClient()

  // 1. Authenticate the user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. If the user is ALREADY in an active debate, send them back to it (stops duplicates)
  const { data: activeDebates, error: findError } = await supabase
    .from('debates')
    .select('*')
    .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
    .in('status', ['waiting', 'live', 'judging'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (findError) {
    console.error('Error finding active debate:', findError)
    return NextResponse.json({ error: findError.message }, { status: 500 })
  }
  if (activeDebates && activeDebates.length > 0) {
    return NextResponse.json(activeDebates[0])
  }

  try {
    const body = await req.json()
    const topic_id = body.topic_id
    const stance: 'pro' | 'con' | undefined = body.stance_a ?? body.stance
    const is_private = body.is_private === true

    if (!topic_id || (stance !== 'pro' && stance !== 'con')) {
      return NextResponse.json({ error: 'Missing topic_id or stance' }, { status: 400 })
    }

    // 3. Matchmaking: join a waiting PUBLIC debate on this topic where the creator took the opposite side
    if (!is_private) {
      const oppositeStance = stance === 'pro' ? 'con' : 'pro'
      const { data: waiting } = await supabase
        .from('debates')
        .select('id')
        .eq('topic_id', topic_id)
        .eq('status', 'waiting')
        .eq('stance_a', oppositeStance)
        .eq('is_private', false)
        .neq('player_a', user.id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (waiting && waiting.length > 0) {
        const deadline = new Date(Date.now() + 60 * 60 * 1000).toISOString()
        const { data: joined } = await supabase
          .from('debates')
          .update({ player_b: user.id, status: 'live', deadline })
          .eq('id', waiting[0].id)
          .eq('status', 'waiting') // only if nobody else grabbed it first
          .select()
          .maybeSingle()

        if (joined) return NextResponse.json(joined)
        // someone else took it a split second earlier: fall through and create a new room
      }
    }

    // 4. Nobody to match with: create a new waiting room
    const { data: newDebate, error: createError } = await supabase
      .from('debates')
      .insert({
        topic_id,
        player_a: user.id,
        stance_a: stance,
        is_private,
        status: 'waiting',
        current_turn: 1,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating debate:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }
    return NextResponse.json(newDebate)
  } catch (error: any) {
    console.error('Server Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}