import { NextResponse } from 'next/server'
import { admin } from '@/lib/supabase/admin'
import OpenAI from 'openai'

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
})

interface AIJudgment {
  winner: 'player_a' | 'player_b' | 'draw';
  scores: any;
  rationale: string;
}

export async function POST(req: Request) {
  const { debate_id } = await req.json()
  if (!debate_id) return NextResponse.json({ error: 'Missing debate ID' }, { status: 400 })

  // 1. Lock the debate (Change status to judging)
  const { data: debate, error: lockError } = await admin
    .from('debates')
    .update({ status: 'judging' })
    .eq('id', debate_id)
    .eq('status', 'live')
    .select()
    .single()

  if (lockError || !debate) {
    return NextResponse.json({ error: 'Debate is not live or already judging' }, { status: 400 })
  }

  try {
    const { data: topic } = await admin.from('topics').select('title').eq('id', debate.topic_id).single()
    
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, username')
      .in('id', [debate.player_a, debate.player_b])

    const profileMap: Record<string, string> = {}
    profiles?.forEach(p => { profileMap[p.id] = p.username })

    const nameA = profileMap[debate.player_a] || 'Player A'
    const nameB = profileMap[debate.player_b] || 'Player B'

    const { data: turns } = await admin
      .from('turns')
      .select('*')
      .eq('debate_id', debate_id)
      .order('created_at', { ascending: true })

    // Check for empty debate
    const hasValidTurns = turns && turns.some(t => t.content && t.content.trim() !== '' && t.content !== '[Image sent]')
    
    if (!hasValidTurns) {
      const nullScores = {
        player_a: { argument: 0, rebuttal: 0, evidence: 0, clarity: 0, conduct: 0 },
        player_b: { argument: 0, rebuttal: 0, evidence: 0, clarity: 0, conduct: 0 }
      }

      await admin.from('judgments').upsert({
        debate_id,
        winner_id: null,
        scores: nullScores,
        rationale: "This debate is null and void. Neither participant submitted any arguments or write-ups.",
        model_version: 'system-null-void',
        judge_type: 'ai',
      }, { onConflict: 'debate_id' })

      await admin.from('debates').update({ status: 'completed' }).eq('id', debate_id)
      return NextResponse.json({ success: true })
    }

    const transcript = (turns || [])
      .map(t => `${t.user_id === debate.player_a ? nameA : nameB}: ${t.content}`)
      .join('\n\n')

    const prompt = `You are an impartial debate judge. Judge ONLY the transcript below.
Topic: ${topic?.title}
The debaters are ${nameA} and ${nameB}.

Rubric (score 1-10 each): argument 30%, rebuttal 25%, evidence 20%, clarity 15%, conduct 10%.

Return ONLY valid JSON in this exact format, with no markdown formatting:
{
  "winner": "player_a" or "player_b" or "draw",
  "scores": {
    "player_a": {"argument": 8, "rebuttal": 7, "evidence": 6, "clarity": 9, "conduct": 10},
    "player_b": {"argument": 7, "rebuttal": 8, "evidence": 5, "clarity": 8, "conduct": 9}
  },
  "rationale": "Explain who won using their names (${nameA} and ${nameB})."
}

Transcript:
${transcript}`

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    })

    const responseContent = completion.choices[0].message.content || '{}'
    let parsed: AIJudgment
    try {
      parsed = JSON.parse(responseContent)
    } catch (e) {
      throw new Error("AI returned invalid JSON format")
    }

    // Save judgment with correct type
    await admin.from('judgments').upsert({
      debate_id,
      winner_id: parsed.winner === 'player_a' ? debate.player_a : parsed.winner === 'player_b' ? debate.player_b : null,
      scores: parsed.scores,
      rationale: parsed.rationale,
      model_version: 'openai/gpt-oss-120b',
      judge_type: 'ai', // <--- FIXED
    }, { onConflict: 'debate_id' })

    // Award Points (Only for public debates)
    if (!debate.is_private) {
      const pointsA = parsed.winner === 'player_a' ? 10 : parsed.winner === 'draw' ? 5 : 3;
      const pointsB = parsed.winner === 'player_b' ? 10 : parsed.winner === 'draw' ? 5 : 3;
      
      // Add points (assuming you have an RPC or just update profiles)
      // Note: You may need a secure way to increment points, but this is the basic logic
      const { error: errA } = await admin.rpc('increment_points', { user_id: debate.player_a, amount: pointsA })
      const { error: errB } = await admin.rpc('increment_points', { user_id: debate.player_b, amount: pointsB })
      
      if (errA || errB) console.error("Failed to award points", errA, errB)
    }

    // Mark as completed
    await admin.from('debates').update({ status: 'completed' }).eq('id', debate_id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("🚨 AI JUDGE FAILED:", error)
    await admin.from('debates').update({ status: 'live' }).eq('id', debate_id)
    return NextResponse.json({ error: error.message || 'AI failed to judge' }, { status: 500 })
  }
}