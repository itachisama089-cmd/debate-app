import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createServerClient()

  // 1. Authenticate the user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Check if user is in a LIVE or JUDGING debate (must finish these first)
  const { data: activeDebate, error: findError } = await supabase
    .from('debates')
    .select('*')
    .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
    .in('status', ['live', 'judging'])
    .maybeSingle()

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 })
  }

  if (activeDebate) {
    return NextResponse.json(activeDebate)
  }

  // 3. Get the requested topic details
  try {
    const body = await req.json()
    const { topic_id, is_private, stance_a } = body

    if (!topic_id || !stance_a) {
      return NextResponse.json({ error: 'Missing topic_id or stance_a' }, { status: 400 })
    }

    // 4. Check if user is ALREADY WAITING for THIS EXACT topic
    const { data: waitingDebate } = await supabase
      .from('debates')
      .select('*')
      .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
      .eq('status', 'waiting')
      .eq('topic_id', topic_id)
      .maybeSingle()

    if (waitingDebate) {
      return NextResponse.json(waitingDebate)
    }

    // 5. If they are waiting for a DIFFERENT topic, abandon the old room to prevent ghosting
    await supabase
      .from('debates')
      .update({ status: 'abandoned' })
      .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
      .eq('status', 'waiting')

    // 6. MATCHMAKING: Look for an opponent waiting with the OPPOSITE stance
    if (!is_private) {
      const opponentStance = stance_a === 'pro' ? 'con' : 'pro';
      
      const { data: waitingOpponent } = await supabase
        .from('debates')
        .select('*')
        .eq('topic_id', topic_id)
        .eq('is_private', false)
        .eq('status', 'waiting')
        .eq('stance_a', opponentStance)
        .is('player_b', null)
        .limit(1)
        .maybeSingle();

      // If we found someone waiting, join their room!
      if (waitingOpponent) {
        const { data: joinedDebate, error: joinError } = await supabase
          .from('debates')
          .update({ 
            player_b: user.id, 
            status: 'live',
            deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString() // Sets a 1-hour timer
          })
          .eq('id', waitingOpponent.id)
          .select()
          .single();
          
        if (joinError) throw joinError;
        return NextResponse.json(joinedDebate);
      }
    }

    // 7. If no opponent was found, create a new room and wait
    const { data: newDebate, error: createError } = await supabase
      .from('debates')
      .insert({
        topic_id,
        player_a: user.id,
        stance_a,
        is_private: is_private || false,
        status: 'waiting',
        current_turn: 1,
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json(newDebate)

  } catch (error: any) {
    console.error("Server Error:", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}