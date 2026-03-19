import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      problem_name,
      problem_number,
      problem_slug,
      problem_description,
      submitted_code,
      errors_log,
      language,
    } = await request.json();

    // Build context for Claude
    const errorsContext =
      errors_log && errors_log.length > 0
        ? `\n\nDuring this session, the user had ${errors_log.length} failed attempt(s):\n` +
          errors_log
            .map(
              (e: { attempt: number; result: string; code_snapshot: string }) =>
                `Attempt ${e.attempt}: ${e.result}\nCode:\n${e.code_snapshot.slice(0, 500)}`
            )
            .join("\n---\n")
        : "\n\nThe user solved this on their first try!";

    const prompt = `You are a coding interview coach. Analyze this solved LeetCode problem and generate concise learning notes.

Problem: ${problem_name} (#${problem_number || "?"})
Language: ${language}
${problem_description ? `\nDescription:\n${problem_description.slice(0, 800)}` : ""}

Final accepted solution:
\`\`\`${language}
${submitted_code || "Code not captured"}
\`\`\`
${errorsContext}

Generate learning notes in this exact format (use markdown):

## Approach
(1-2 sentences describing the approach used)

## Key Pattern
(Name the algorithmic pattern: e.g., "Two Pointers", "Sliding Window", "DFS/BFS", "Dynamic Programming", etc.)

## Complexity
- Time: O(?)
- Space: O(?)

## What I Learned
(2-3 bullet points about key insights, especially from mistakes made)

## Edge Cases to Remember
(2-3 bullet points)

## Related Problems
(List 2-3 related LeetCode problems by name)

Keep it concise and actionable — these are quick review notes.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Claude API error:", err);
      return NextResponse.json(
        { error: "Failed to generate notes" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const aiNotes = data.content[0].text;

    // Extract patterns from the notes
    const patternMatch = aiNotes.match(/## Key Pattern\n+(.+)/);
    const patterns = patternMatch
      ? patternMatch[1].split(/[,;]/).map((p: string) => p.trim()).filter(Boolean)
      : [];

    const complexityMatch = aiNotes.match(/- Time: (O\([^)]+\))/);
    const complexity = complexityMatch ? complexityMatch[1] : "";

    // Save to Supabase
    await supabase.from("coding_notes").insert({
      user_id: user.id,
      problem_name,
      problem_number,
      problem_slug,
      problem_description: problem_description?.slice(0, 1000),
      submitted_code: submitted_code?.slice(0, 5000),
      errors_log,
      language,
      ai_notes: aiNotes,
      patterns,
      complexity,
    });

    return NextResponse.json({ success: true, notes: aiNotes });
  } catch (error) {
    console.error("Coding notes error:", error);
    return NextResponse.json(
      { error: "Failed to generate notes" },
      { status: 500 }
    );
  }
}
