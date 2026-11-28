import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { admin } from '@/lib/supabase/admin'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: debateId } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: debate } = await admin.from('debates').select('*').eq('id', debateId).single()
  if (!debate) return NextResponse.json({ error: 'Debate not found' }, { status: 404 })

  if (debate.player_a === user.id || debate.player_b === user.id) {
    return NextResponse.json({ error: 'Players cannot be judges' }, { status: 403 })
  }

  const waitingForHuman = debate.status === 'judging' && !!debate.judge_wait_until
  if (debate.status !== 'live' && debate.status !== 'waiting' && !waitingForHuman) {
    return NextResponse.json({ error: 'This debate can no longer take a judge' }, { status: 400 })
  }
  if (debate.judge_id) {
    return NextResponse.json({ error: 'A judge is already assigned to this debate' }, { status: 409 })
  }

  const patch: Record<string, any> = { judge_id: user.id }
  if (waitingForHuman) patch.judge_wait_until = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  const { data: assigned, error } = await admin
    .from('debates')
    .update(patch)
    .eq('id', debateId)
    .is('judge_id', null)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!assigned || assigned.length === 0) {
    return NextResponse.json({ error: 'A judge is already assigned to this debate' }, { status: 409 })
  }
  return NextResponse.json({ success: true })
}