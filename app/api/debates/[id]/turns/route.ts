import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const debateId = params.id
  const supabase = createRouteHandlerClient({ cookies })

  // 1. Get the current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get the request body
  const body = await req.json()
  const { content, image_url } = body

  // 3. Validate the payload (No more turn_number check!)
  if (!content && !image_url) {
    return NextResponse.json(
      { error: 'Missing content or image' },
      { status: 400 }
    )
  }

  // 4. Insert the new turn into the database
  const { data, error } = await supabase
    .from('turns')
    .insert({
      debate_id: debateId,
      user_id: user.id,
      content: content || '', // Ensure content is a string
      image_url: image_url || null,
      // turn_number is removed since the column is gone
    })
    .select()
    .single()

  if (error) {
    console.error('Error inserting turn:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}