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

    const { passage, reference, messages } = await request.json();

    // Build conversation history for Claude
    const systemPrompt = `You are a warm, thoughtful Bible reflection guide. You are having a short conversation with someone about this passage from ${reference}:

"${passage}"

Guidelines:
- If this is the first message (no prior conversation), ask ONE thoughtful, personal reflection question about the passage. Make it relate to their daily life.
- If they have responded, engage warmly with their answer, share a brief insight, and if the conversation has fewer than 3 exchanges, ask a gentle follow-up.
- Keep responses to 2-3 sentences maximum.
- Be encouraging and warm, never preachy.
- After 3 total exchanges, wrap up with a brief, encouraging closing thought.`;

    const claudeMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })
    );

    // If no messages yet, start the conversation
    if (claudeMessages.length === 0) {
      claudeMessages.push({
        role: "user",
        content:
          "Please ask me a reflection question about today's passage.",
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system: systemPrompt,
        messages: claudeMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json(
        { error: "Failed to generate reflection" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.content[0].text;

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error("Reflection error:", error);
    return NextResponse.json(
      { error: "Failed to generate reflection" },
      { status: 500 }
    );
  }
}
