import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, message } = await req.json()

  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  // Prevent massive text submissions
  if (subject.length > 120 || message.length > 2000) {
    return NextResponse.json({ error: 'Complaint text is too long.' }, { status: 400 })
  }

  const { error } = await supabase.from('complaints').insert({
    user_id: user.id,
    subject,
    message
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}