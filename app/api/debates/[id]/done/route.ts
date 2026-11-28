import { NextResponse, after } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { admin } from '@/lib/supabase/admin'

const INVITED_JUDGE_WAIT_MS = 5 * 60 * 1000   // 5 mins
const ASSIGNED_JUDGE_WAIT_MS = 15 * 60 * 1000 // 15 mins

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: debateId } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: debate } = await admin.from('debates').select('*').eq('id', debateId).single()
  if (!debate) return NextResponse.json({ error: 'Debate not found' }, { status: 404 })

  const isPlayerA = user.id === debate.player_a
  const isPlayerB = user.id === debate.player_b
  if (!isPlayerA && !isPlayerB) {
    return NextResponse.json({ error: 'Only players can finish the debate' }, { status: 403 })
  }
  if (debate.status !== 'live') return NextResponse.json({ success: true })

  const { data: updated } = await admin
    .from('debates')
    .update(isPlayerA ? { player_a_done: true } : { player_b_done: true })
    .eq('id', debateId)
    .select()
    .single()

  if (updated?.player_a_done && updated?.player_b_done) {
    if (updated.judge_id) {
      // A human judge already accepted
      await admin.from('debates')
        .update({ status: 'judging', judge_wait_until: new Date(Date.now() + ASSIGNED_JUDGE_WAIT_MS).toISOString() })
        .eq('id', debateId).eq('status', 'live')
    } else if (updated.judge_invited) {
      // A judge link was copied: give the judge a few minutes to accept
      await admin.from('debates')
        .update({ status: 'judging', judge_wait_until: new Date(Date.now() + INVITED_JUDGE_WAIT_MS).toISOString() })
        .eq('id', debateId).eq('status', 'live')
    } else {
      // No judge involved: the AI judges right away
      const baseUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
      after(async () => {
        try {
          await fetch(`${baseUrl}/api/judge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ debate_id: debateId })
          })
        } catch (err) {
          console.error('Failed to trigger AI:', err)
        }
      })
    }
  }

  return NextResponse.json({ success: true })
}