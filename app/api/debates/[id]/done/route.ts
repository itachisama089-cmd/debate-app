import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { after } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: debateId } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: debate } = await supabase.from('debates').select('*').eq('id', debateId).single()
  if (!debate) return NextResponse.json({ error: 'Debate not found' }, { status: 404 })

  // Security: Only players can mark themselves done
  const isPlayerA = user.id === debate.player_a
  const isPlayerB = user.id === debate.player_b
  if (!isPlayerA && !isPlayerB) {
    return NextResponse.json({ error: 'Only players can finish the debate' }, { status: 403 })
  }

  const updateField = isPlayerA ? 'player_a_done' : 'player_b_done'
  await supabase.from('debates').update({ [updateField]: true }).eq('id', debateId)

  const { data: updatedDebate } = await supabase.from('debates').select('*').eq('id', debateId).single()

  // If BOTH are done, AND there is no human judge, trigger AI
  if (updatedDebate?.player_a_done && updatedDebate?.player_b_done) {
    if (!updatedDebate.judge_id) {
      // DO NOT set status to 'judging' here. Let the /api/judge route do that!
      const baseUrl = process.env.SITE_URL || new URL(req.url).origin
      
      // Use Next.js 'after' to run this reliably in the background
      after(async () => {
        try {
          await fetch(`${baseUrl}/api/judge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ debate_id: debateId })
          })
        } catch (err) {
          console.error("Failed to trigger AI:", err)
        }
      })
    } else {
      // If there IS a human judge, we just set status to judging and wait for them
      await supabase.from('debates').update({ status: 'judging' }).eq('id', debateId)
    }
  }

  return NextResponse.json({ success: true })
}