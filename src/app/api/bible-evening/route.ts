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

    const { passage, reference, morningJournal, todaySessions, messages } =
      await request.json();

    const sessionSummary = todaySessions
      .map((s: { category: string; duration: number }) => `${s.category} (${s.duration}min)`)
      .join(", ");

    const systemPrompt = `You are a warm, thoughtful evening reflection guide. The user completed their morning devotion on ${reference}:

"${passage.slice(0, 300)}"

Their morning journal entry: "${morningJournal?.slice(0, 300) || "No journal entry"}"

Today's focus sessions: ${sessionSummary || "No sessions recorded yet"}

Guidelines:
- If this is the first message, ask ONE warm reflection question about how their day went in light of the morning passage. Reference something specific from their sessions or journal.
- Keep responses to 2-3 sentences. Be warm and encouraging.
- After 2-3 exchanges, wrap up with an encouraging thought for the evening.
- Acknowledge their efforts and growth.`;

    const claudeMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })
    );

    if (claudeMessages.length === 0) {
      claudeMessages.push({
        role: "user",
        content:
          "Please ask me a reflection question about how my day went.",
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
    console.error("Evening reflection error:", error);
    return NextResponse.json(
      { error: "Failed to generate reflection" },
      { status: 500 }
    );
  }
}
