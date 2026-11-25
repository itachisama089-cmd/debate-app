import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: debateId } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: debate } = await supabase.from('debates').select('*').eq('id', debateId).single()
  
  if (debate?.status !== 'live' && debate?.status !== 'waiting') {
    return NextResponse.json({ error: 'Debate is not active' }, { status: 400 })
  }
  if (debate?.judge_id) {
    return NextResponse.json({ error: 'A judge is already assigned' }, { status: 400 })
  }

  await supabase.from('debates').update({ judge_id: user.id }).eq('id', debateId)

  return NextResponse.json({ success: true })
}