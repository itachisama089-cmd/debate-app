import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const { id } = await params
    
    // 1. Check if the user is logged in
    if (authError || !user) {
      console.log("AUTH ERROR IN TURNS:", authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Extract image_url alongside content and turn_number
    const { content, turn_number, image_url } = await req.json()

    // Allow sending just an image (content will be "[Image sent]" from the frontend)
    if ((!content && !image_url) || turn_number === undefined) {
      return NextResponse.json({ error: 'Missing content, image, or turn number' }, { status: 400 })
    }

    // 3. Fetch the debate so we know who the players are for the notification
    const { data: debate, error: debateError } = await supabase
      .from('debates')
      .select('player_a, player_b')
      .eq('id', id)
      .single()

    if (debateError || !debate) {
      return NextResponse.json({ error: 'Debate not found' }, { status: 404 })
    }

    // 4. Insert the turn using UPSERT (fixes duplicate key errors and includes image_url)
    const { error: insertError } = await supabase.from('turns').upsert({
      debate_id: id,
      user_id: user.id,
      turn_number: turn_number,
      content: content,
      image_url: image_url // <--- Added image_url here
    }, { 
      onConflict: 'debate_id, turn_number' 
    })

    if (insertError) {
      console.log("INSERT ERROR:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    // 5. Update the debate room so the next player knows it's their turn
    const { error: updateError } = await supabase.from('debates')
      .update({ current_turn: turn_number + 1 })
      .eq('id', id)

    if (updateError) {
      console.log("UPDATE ERROR:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // 6. Send a notification to the opponent (Only if an opponent exists!)
    if (debate.player_b) {
      const opponentId = user.id === debate.player_a ? debate.player_b : debate.player_a
      
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: opponentId,
        title: 'New Argument!',
        message: 'Your opponent has submitted an argument. It is your turn to respond.',
        link: `/debate/${id}`
      })

      if (notifError) {
        console.log("NOTIFICATION ERROR:", notifError)
      }
    }

    // 7. Success!
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.log("❌ SERVER ERROR IN TURNS:", error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}