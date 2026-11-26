import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user is a player
  const { data: debate } = await supabase.from('debates').select('*').eq('id', id).single()
  if (!debate || (debate.player_a !== user.id && debate.player_b !== user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Remove judge and trigger AI judge
  await supabase.from('debates').update({ judge_id: null }).eq('id', id)
  
  fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/judge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ debate_id: id })
  }).catch(() => {})

  return NextResponse.json({ success: true })
}