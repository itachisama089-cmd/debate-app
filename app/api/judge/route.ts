import { NextResponse } from 'next/server'
import { admin } from '@/lib/supabase/admin'
import OpenAI from 'openai'

// Make sure you have GROQ_API_KEY in your .env.local
const groq = new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
})

// Define the expected shape of the AI response for TypeScript
interface AIJudgment {
  winner: 'player_a' | 'player_b' | 'draw';
  scores: any;
  rationale: string;
}

export async function POST(req: Request) {
  const { debate_id } = await req.json()
  
  if (!debate_id) return NextResponse.json({ error: 'Missing debate ID' }, { status: 400 })

  // 1. Lock the debate
  const { data: debate, error: lockError } = await admin.from('debates')
    .update({ status: 'judging' })
    .eq('id', debate_id)
    .eq('status', 'live') 
    .select()
    .single()

  if (lockError || !debate) {
    return NextResponse.json({ error: 'Debate is not live or already judging' }, { status: 400 })
  }

  try {
    // 2. Fetch data
    const { data: topic } = await admin.from('topics').select('title').eq('id', debate.topic_id).single()
    const { data: turns } = await admin.from('turns').select('*').eq('debate_id', debate_id).order('turn_number', { ascending: true })

    const transcript = (turns || []).map(t => 
      `Turn ${t.turn_number} (${t.user_id === debate.player_a ? 'Player A' : 'Player B'}): ${t.content}`
    ).join('\n\n')

    // 3. Call Groq
    const prompt = `You are an impartial debate judge. Judge ONLY the transcript below.
Topic: ${topic?.title}
Format: Timed debate with unlimited turns.

Rubric (score 1-10 each): argument 30%, rebuttal 25%, evidence 20%, clarity 15%, conduct 10%.
Return ONLY valid JSON in this exact format, with no markdown formatting or extra text:
{
  "winner": "player_a" or "player_b" or "draw",
  "scores": {
    "player_a": {"argument": 8, "rebuttal": 7, "evidence": 6, "clarity": 9, "conduct": 10},
    "player_b": {"argument": 7, "rebuttal": 8, "evidence": 5, "clarity": 8, "conduct": 9}
  },
  "rationale": "A short paragraph explaining who won and why."
}

Transcript:
${transcript}`

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    })

    // 4. Parse the AI Response safely
    const responseContent = completion.choices[0].message.content || '{}'
    let parsed: AIJudgment;
    try {
      parsed = JSON.parse(responseContent)
    } catch (e) {
      console.error("Failed to parse AI JSON:", responseContent)
      throw new Error("AI returned invalid JSON format")
    }

    // 5. Save judgment to database
    const { error: judgeError } = await admin.from('judgments').insert({
      debate_id,
      winner_id: parsed.winner === 'player_a' ? debate.player_a : parsed.winner === 'player_b' ? debate.player_b : null,
      scores: parsed.scores,
      rationale: parsed.rationale,
      model_version: 'openai/gpt-oss-120b'
    })

    if (judgeError) {
      console.error("Failed to insert judgment:", judgeError)
      throw new Error("Database rejected the judgment")
    }

    // 6. Mark debate as completed
    await admin.from('debates').update({ 
      status: 'completed', 
      completed_at: new Date().toISOString() 
    }).eq('id', debate_id)

    // 7. Award points ONLY if it's a public matchmaking debate
    if (!debate.is_private) {
      // Define points based on the winner
      const ptsA = parsed.winner === 'player_a' ? 10 : parsed.winner === 'draw' ? 5 : 3
      const ptsB = parsed.winner === 'player_b' ? 10 : parsed.winner === 'draw' ? 5 : 3
      
      await admin.rpc('increment_points', { uid: debate.player_a, amt: ptsA })
      
      if (debate.player_b) {
        await admin.rpc('increment_points', { uid: debate.player_b, amt: ptsB })
      }
    }
    
    // (Removed the duplicate point awarding code that was here)

    // 8. Send Notifications to BOTH players (Only if player_b exists)
    const notifications = [
      { 
        user_id: debate.player_a, 
        title: 'Verdict Ready!', 
        message: 'The AI has judged your debate. Click to see who won.', 
        link: `/debate/${debate_id}` 
      }
    ]

    if (debate.player_b) {
      notifications.push({ 
        user_id: debate.player_b, 
        title: 'Verdict Ready!', 
        message: 'The AI has judged your debate. Click to see who won.', 
        link: `/debate/${debate_id}` 
      })
    }

    await admin.from('notifications').insert(notifications)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.log("🚨 AI JUDGE FAILED:", error)
    
    // Unlock the debate so it doesn't get stuck in 'judging' state
    await admin.from('debates').update({ status: 'live' }).eq('id', debate_id)
    
    return NextResponse.json({ error: error.message || 'AI failed to judge' }, { status: 500 })
  }
}