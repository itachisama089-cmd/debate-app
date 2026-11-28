import { NextResponse, after } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { admin } from '@/lib/supabase/admin'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: debate } = await admin.from('debates').select('*').eq('id', id).single()
  if (!debate) return NextResponse.json({ error: 'Debate not found' }, { status: 404 })

  if (debate.player_a !== user.id && debate.player_b !== user.id) {
    return NextResponse.json({ error: 'Only the players can do this' }, { status: 403 })
  }

  const { data: reset } = await admin
    .from('debates')
    .update({ judge_id: null, judge_wait_until: null, status: 'live' })
    .eq('id', id)
    .eq('status', 'judging')
    .not('judge_wait_until', 'is', null)
    .select('id')

  if (!reset || reset.length === 0) {
    return NextResponse.json({ success: true, skipped: true })
  }

  const baseUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
  after(async () => {
    try {
      await fetch(`${baseUrl}/api/judge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debate_id: id })
      })
    } catch (err) {
      console.error('Failed to trigger AI:', err)
    }
  })

  return NextResponse.json({ success: true })
}