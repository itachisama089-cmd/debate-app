import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Next.js 15 requires awaiting params
  const { id: debateId } = await params
  const supabase = await createServerClient()

  // 1. Get the current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get the request body
  const body = await req.json()
  const { content, image_url } = body

  // 3. Validate the payload
  if (!content && !image_url) {
    return NextResponse.json(
      { error: 'Missing content or image' },
      { status: 400 }
    )
  }

  // 4. SECURITY CHECK: Make sure the debate is active and the user is a player
  const { data: debate, error: debateError } = await supabase
    .from('debates')
    .select('player_a, player_b, status')
    .eq('id', debateId)
    .single()

  if (debateError || !debate) {
    return NextResponse.json({ error: 'Debate not found' }, { status: 404 })
  }

  if (debate.status !== 'live') {
    return NextResponse.json({ error: 'Debate is not live' }, { status: 400 })
  }

  if (user.id !== debate.player_a && user.id !== debate.player_b) {
    return NextResponse.json({ error: 'Only players can send messages' }, { status: 403 })
  }

  // 5. Insert the new turn into the database
  const { data, error } = await supabase
    .from('turns')
    .insert({
      debate_id: debateId,
      user_id: user.id,
      content: content || '',
      image_url: image_url || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error inserting turn:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}