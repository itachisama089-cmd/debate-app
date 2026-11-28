import { NextResponse } from 'next/server'
import { admin } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { winner_id, rationale } = await req.json()

  // 1. Fetch the debate
  const { data: debate } = await admin.from('debates').select('*').eq('id', id).single()
  
  if (!debate) {
    return NextResponse.json({ error: 'Debate not found' }, { status: 404 })
  }

  // 2. Ensure the debate is actually in the judging phase
  if (debate.status !== 'judging') {
    return NextResponse.json({ error: 'Debate is not currently in the judging phase' }, { status: 400 })
  }

  // 3. Verify the user is the assigned judge
  if (debate.judge_id !== user.id) {
    return NextResponse.json({ error: 'You are not the judge for this debate' }, { status: 403 })
  }

  // 4. Save the human verdict (using upsert to prevent crashes on double-clicks)
  const { error: judgeError } = await admin.from('judgments').upsert({
    debate_id: id,
    winner_id: winner_id === 'draw' ? null : winner_id,
    scores: { player_a: { argument: 0, rebuttal: 0, evidence: 0, clarity: 0, conduct: 0 }, player_b: { argument: 0, rebuttal: 0, evidence: 0, clarity: 0, conduct: 0 } }, // Placeholder scores for human
    rationale: rationale,
    judge_type: 'human',
    model_version: 'human'
  }, { onConflict: 'debate_id' })

  if (judgeError) {
    console.error("Failed to save human verdict:", judgeError)
    return NextResponse.json({ error: judgeError.message }, { status: 500 })
  }

  // 5. Mark the debate as completed and clear the wait timer
  await admin.from('debates').update({ 
    status: 'completed', 
    completed_at: new Date().toISOString(),
    judge_wait_until: null 
  }).eq('id', id)

  // 6. Award points (Only for public debates)
  if (!debate.is_private) {
    const ptsA = winner_id === debate.player_a ? 10 : winner_id === 'draw' ? 5 : 3
    const ptsB = winner_id === debate.player_b ? 10 : winner_id === 'draw' ? 5 : 3
    
    try {
      await admin.rpc('increment_points', { uid: debate.player_a, amt: ptsA })
      if (debate.player_b) await admin.rpc('increment_points', { uid: debate.player_b, amt: ptsB })
    } catch (err) {
      console.error("Failed to award points:", err)
    }
  }

  return NextResponse.json({ success: true })
}