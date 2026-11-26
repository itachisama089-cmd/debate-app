import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: debateId } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only allow leaving if the debate hasn't started yet
  const { data: debate } = await supabase.from('debates').select('*').eq('id', debateId).single()
  
  if (debate?.status === 'waiting') {
    await supabase.from('debates').update({ status: 'abandoned' }).eq('id', debateId)
  }

  return NextResponse.json({ success: true })
}