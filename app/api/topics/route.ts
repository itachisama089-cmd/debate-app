import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, category, sideALabel, sideBLabel, image_url } = await req.json()
  
  if (!title || !category) return NextResponse.json({ error: 'Title and category are required' }, { status: 400 })

  const { data, error } = await supabase.from('topics').insert({
    title,
    category,
    creator_id: user.id,
    side_a_label: sideALabel || 'Pro',
    side_b_label: sideBLabel || 'Con',
    image_url: image_url // Save the uploaded image URL
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}