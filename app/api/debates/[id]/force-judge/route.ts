import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { after } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: debateId } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: debate } = await supabase.from('debates').select('*').eq('id', debateId).single()
  
  // Security: Only players can force AI judging
  if (user.id !== debate?.player_a && user.id !== debate?.player_b) {
    return NextResponse.json({ error: 'Only players can force AI judging' }, { status: 403 })
  }

  await supabase.from('debates').update({ judge_id: null, status: 'live' }).eq('id', debateId)

  const baseUrl = process.env.SITE_URL || new URL(req.url).origin
  
  after(async () => {
    await fetch(`${baseUrl}/api/judge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debate_id: debateId })
    })
  })

  return NextResponse.json({ success: true })
}