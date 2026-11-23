import { NextResponse } from 'next/server'
import { admin } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { winner_id, rationale } = await req.json()

  // 1. Verify the user is the assigned judge
  const { data: debate } = await admin.from('debates').select('*').eq('id', id).single()
  if (!debate || debate.judge_id !== user.id) {
    return NextResponse.json({ error: 'You are not the judge for this debate' }, { status: 403 })
  }

  // 2. Save the human verdict (giving 0 scores since it's manual)
  await admin.from('judgments').insert({
    debate_id: id,
    winner_id: winner_id === 'draw' ? null : winner_id,
    scores: { player_a: { argument: 0, rebuttal: 0, evidence: 0, clarity: 0, conduct: 0 }, player_b: { argument: 0, rebuttal: 0, evidence: 0, clarity: 0, conduct: 0 } }, // Placeholder scores
    rationale: rationale,
    judge_type: 'human',
    model_version: 'human'
  })

  // 3. Mark completed
  await admin.from('debates').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)

  // 4. Award points
  if (!debate.is_private) {
    const ptsA = winner_id === debate.player_a ? 10 : winner_id === 'draw' ? 5 : 3
    const ptsB = winner_id === debate.player_b ? 10 : winner_id === 'draw' ? 5 : 3
    await admin.rpc('increment_points', { uid: debate.player_a, amt: ptsA })
    if (debate.player_b) await admin.rpc('increment_points', { uid: debate.player_b, amt: ptsB })
  }

  return NextResponse.json({ success: true })
}