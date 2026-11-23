import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Get the debate to see who is A and who is B
  const { data: debate } = await supabase.from('debates').select('*').eq('id', id).single()
  if (!debate) return NextResponse.json({ error: 'Debate not found' }, { status: 404 })

  const isPlayerA = user.id === debate.player_a
  const isPlayerB = user.id === debate.player_b
  
  if (!isPlayerA && !isPlayerB) return NextResponse.json({ error: 'You are not in this debate' }, { status: 403 })

  // 2. Update the correct player's "done" status
  const updates = isPlayerA ? { player_a_done: true } : { player_b_done: true }

  const { data: updatedDebate, error } = await supabase.from('debates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // 3. Check if BOTH players are now done
 
  if (updatedDebate.player_a_done && updatedDebate.player_b_done) {
    if (updatedDebate.judge_id) {
      // A human judge is assigned. Just set status to judging and wait for them.
      await supabase.from('debates').update({ status: 'judging' }).eq('id', id)
    } else {
      // No human judge. Trigger the AI.
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/judge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debate_id: id })
      }).catch(() => {})
    }
  }
  return NextResponse.json(updatedDebate)
}