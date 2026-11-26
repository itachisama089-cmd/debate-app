import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: debateId } = await params
  const supabase = await createServerClient()

  // 1. Authenticate the user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Fetch the debate
  const { data: debate, error: fetchError } = await supabase
    .from('debates')
    .select('*')
    .eq('id', debateId)
    .single()

  if (fetchError || !debate) {
    return NextResponse.json({ error: 'Debate not found' }, { status: 404 })
  }

  // 3. Ensure the debate is in a state that allows a judge
  if (debate.status !== 'live' && debate.status !== 'waiting') {
    return NextResponse.json({ error: 'Debate is not active' }, { status: 400 })
  }

  // 4. Ensure there isn't already a judge assigned
  if (debate.judge_id) {
    return NextResponse.json({ error: 'A judge is already assigned to this debate' }, { status: 400 })
  }

  // 5. CRITICAL FIX: Prevent players from being judges
  if (debate.player_a === user.id || debate.player_b === user.id) {
    return NextResponse.json({ error: 'Players cannot be judges' }, { status: 403 })
  }

  // 6. Assign the current user as the judge
  const { error: updateError } = await supabase
    .from('debates')
    .update({ judge_id: user.id })
    .eq('id', debateId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}