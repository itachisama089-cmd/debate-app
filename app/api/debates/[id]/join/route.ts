import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Set the deadline to 1 hour from now
  const deadline = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase.from('debates').update({
    player_b: user.id,
    status: 'live',
    current_turn: 1,
    deadline: deadline 
  }).eq('id', id).eq('status', 'waiting').select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
   // Notify Player A that someone joined
   await supabase.from('notifications').insert({
    user_id: debate.player_a,
    title: 'Opponent Joined!',
    message: 'Someone accepted your debate challenge. The debate is now live.',
    link: `/debate/${id}`
  })
  return NextResponse.json(data)
}