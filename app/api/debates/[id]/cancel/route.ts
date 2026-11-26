import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Delete the debate only if it's still waiting (nobody has joined yet) and you are Player A
  const { error } = await supabase.from('debates')
    .delete()
    .eq('id', id)
    .eq('player_a', user.id)
    .eq('status', 'waiting')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}