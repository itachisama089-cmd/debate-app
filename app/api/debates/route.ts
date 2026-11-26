import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createServerClient()

  // 1. Authenticate the user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Check if the user is ALREADY in an active debate (Duplicate room fix)
  const { data: activeDebate, error: findError } = await supabase
    .from('debates')
    .select('*')
    .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
    .in('status', ['waiting', 'live', 'judging'])
    .maybeSingle()

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 })
  }

  // If they are already in a room, return it and don't create a new one
  if (activeDebate) {
    return NextResponse.json(activeDebate)
  }

  // 3. They are not in a room. Let's find them a match.
  try {
    const body = await req.json()
    const { topic_id, is_private, stance_a } = body

    if (!topic_id || !stance_a) {
      return NextResponse.json({ error: 'Missing topic_id or stance_a' }, { status: 400 })
    }

    // MATCHMAKING LOGIC: If it's a public debate, look for an opponent waiting with the OPPOSITE stance
    if (!is_private) {
      const opponentStance = stance_a === 'pro' ? 'con' : 'pro';
      
      const { data: waitingOpponent } = await supabase
        .from('debates')
        .select('*')
        .eq('topic_id', topic_id)
        .eq('is_private', false)
        .eq('status', 'waiting')
        .eq('stance_a', opponentStance) // They chose the opposite of what I'm choosing
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

    // 4. If no opponent was found (or it's a private room), create a new room and wait
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