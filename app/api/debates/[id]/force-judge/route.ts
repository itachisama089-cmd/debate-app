import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: debateId } = await params
  const supabase = await createServerClient()

  // Clear the human judge and set status to live so the judge route accepts it
  await supabase.from('debates').update({ judge_id: null, status: 'live' }).eq('id', debateId)

  // Trigger the AI judge (using the origin trick so it works on Vercel & Localhost)
  const origin = req.headers.get('origin') || new URL(req.url).origin;
  await fetch(`${origin}/api/judge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ debate_id: debateId })
  })

  return NextResponse.json({ success: true })
}