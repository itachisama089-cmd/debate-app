import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createServerClient()

  // 1. Authenticate the user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Check if the user is ALREADY in an active debate
  // We look for debates where the user is player_a OR player_b, and the status is active.
  const { data: activeDebate, error: findError } = await supabase
    .from('debates')
    .select('*')
    .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
    .in('status', ['waiting', 'live', 'judging'])
    .maybeSingle()

  if (findError) {
    console.error("Error finding active debate:", findError)
    return NextResponse.json({ error: findError.message }, { status: 500 })
  }

  // If an active debate is found, return it immediately! (This stops duplicates)
  if (activeDebate) {
    return NextResponse.json(activeDebate)
  }

  // 3. If no active debate exists, create a new one
  try {
    const body = await req.json()
    const { topic_id, is_private, stance_a } = body

    if (!topic_id || !stance_a) {
      return NextResponse.json({ error: 'Missing topic_id or stance_a' }, { status: 400 })
    }

    const { data: newDebate, error: createError } = await supabase
      .from('debates')
      .insert({
        topic_id,
        player_a: user.id,
        stance_a,
        is_private: is_private || false,
        status: 'waiting',
        current_turn: 1, // Keep this if your database still requires it, otherwise it can be removed
      })
      .select()
      .single()

    if (createError) {
      console.error("Error creating debate:", createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json(newDebate)

  } catch (error: any) {
    console.error("Server Error:", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}