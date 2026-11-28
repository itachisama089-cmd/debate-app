import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { admin } from '@/lib/supabase/admin'

export async function DELETE() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const uid = user.id

  const run = async (label: string, query: PromiseLike<{ error: any }>) => {
    const { error } = await query
    if (error) throw new Error(`${label}: ${error.message}`)
  }

  try {
    await run('notifications', admin.from('notifications').delete().eq('user_id', uid))
    await run('reports', admin.from('reports').delete().eq('reporter_id', uid))

    // Debates this user played in, and everything inside them
    const { data: myDebates } = await admin.from('debates').select('id').or(`player_a.eq.${uid},player_b.eq.${uid}`)
    const ids = (myDebates || []).map(d => d.id)
    if (ids.length) {
      await run('turns', admin.from('turns').delete().in('debate_id', ids))
      await run('judgments', admin.from('judgments').delete().in('debate_id', ids))
      await run('debate reports', admin.from('reports').delete().in('debate_id', ids))
      await run('debates', admin.from('debates').delete().in('id', ids))
    }

    // Debates they only judged: keep the debate, remove them as judge
    await run('judge', admin.from('debates').update({ judge_id: null }).eq('judge_id', uid))
    await run('remaining turns', admin.from('turns').delete().eq('user_id', uid))

    // Topics they created
    await run('custom topics', admin.from('topics').delete().eq('creator_id', uid).eq('is_custom', true))
    await admin.from('topics').update({ creator_id: null }).eq('creator_id', uid) // best effort

    await run('profile', admin.from('profiles').delete().eq('id', uid))

    const { error } = await admin.auth.admin.deleteUser(uid)
    if (error) throw new Error(`account: ${error.message}`)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('DELETE ACCOUNT ERROR:', e?.message)
    return NextResponse.json({ error: e?.message || 'Could not delete account' }, { status: 500 })
  }
}