import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { admin } from '@/lib/supabase/admin'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const { id } = await params

    // 1. Verify Authentication
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Set the deadline to 1 hour from now
    const deadline = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    // 3. Attempt to update the debate and join as player_b
    const { data: debate, error } = await supabase
      .from('debates')
      .update({
        player_b: user.id,
        status: 'live',
        current_turn: 1,
        deadline: deadline
      })
      .eq('id', id)
      .eq('status', 'waiting')      // Ensure it's still waiting for a player
      .neq('player_a', user.id)     // Prevent a user from joining their own debate
      .select()
      .single()

    // 4. Handle Database Errors (Race conditions or invalid debate)
    if (error || !debate) {
      return NextResponse.json(
        { error: 'Debate is no longer available or you cannot join this debate' }, 
        { status: 409 } // 409 Conflict
      )
    }

    // 5. Notify Player A that someone joined (Using Admin client to bypass RLS)
    const { error: notifError } = await admin
      .from('notifications')
      .insert({
        user_id: debate.player_a, 
        title: 'Opponent Joined!',
        message: 'Someone accepted your challenge. The parley is now live.',
        link: `/debate/${id}`
      })

    // Log notification error, but don't fail the join request
    if (notifError) {
      console.error('Failed to create notification:', notifError)
    }

    return NextResponse.json(debate)

  } catch (error: any) {
    console.error('Server Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}