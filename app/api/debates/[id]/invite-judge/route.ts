import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { admin } from '@/lib/supabase/admin'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: debate } = await admin.from('debates').select('player_a, player_b, status').eq('id', id).single()
  if (!debate) return NextResponse.json({ error: 'Debate not found' }, { status: 404 })

  if (user.id !== debate.player_a && user.id !== debate.player_b) {
    return NextResponse.json({ error: 'Only the players can do this' }, { status: 403 })
  }

  if (debate.status === 'waiting' || debate.status === 'live') {
    await admin.from('debates').update({ judge_invited: true }).eq('id', id)
  }
  return NextResponse.json({ success: true })
}