import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: debate } = await supabase.from('debates').select('*').eq('id', id).single()
  if (!debate) return NextResponse.json({ error: 'Debate not found' }, { status: 404 })
  if (debate.player_a === user.id || debate.player_b === user.id) {
    return NextResponse.json({ error: 'Players cannot be the judge' }, { status: 403 })
  }

  // Assign this user as the judge
  const { error } = await supabase.from('debates').update({ judge_id: user.id }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  
  return NextResponse.json({ success: true })
}