import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: debateId } = await params
  const supabase = await createServerClient()

  // 1. Get the current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Fetch the current debate
  const { data: debate } = await supabase.from('debates').select('*').eq('id', debateId).single()
  if (!debate) return NextResponse.json({ error: 'Debate not found' }, { status: 404 })

  // 3. Mark this user as done
  const isPlayerA = user.id === debate.player_a
  const updateField = isPlayerA ? 'player_a_done' : 'player_b_done'
  
  await supabase.from('debates').update({ [updateField]: true }).eq('id', debateId)

  // 4. Fetch the updated debate to check if BOTH are done
  const { data: updatedDebate } = await supabase.from('debates').select('*').eq('id', debateId).single()

  if (updatedDebate?.player_a_done && updatedDebate?.player_b_done) {
    // BOTH ARE DONE! Change status to judging
    await supabase.from('debates').update({ status: 'judging' }).eq('id', debateId)

    // Trigger the AI Judge (if there isn't a human judge assigned)
    if (!updatedDebate.judge_id) {
      // THIS IS THE FIX: It automatically grabs the URL (localhost or Vercel)
      const origin = req.headers.get('origin') || new URL(req.url).origin;
      
      // We don't await this so the UI responds instantly to the user
      fetch(`${origin}/api/judge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debate_id: debateId })
      }).catch(err => console.error("Failed to trigger AI:", err))
    }
  }

  return NextResponse.json({ success: true })
}