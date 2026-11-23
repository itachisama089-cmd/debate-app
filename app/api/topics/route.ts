import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, category, sideALabel, sideBLabel } = await req.json()
  
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const { data, error } = await supabase.from('topics').insert({
    title,
    category,
    creator_id: user.id,
    side_a_label: sideALabel || 'Pro',
    side_b_label: sideBLabel || 'Con'
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}