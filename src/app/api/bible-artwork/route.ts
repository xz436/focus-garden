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

    const { journalEntry, reference, passage } = await request.json();

    // Use Claude to generate a beautiful SVG artwork
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: `Create a beautiful, detailed SVG illustration (viewBox="0 0 800 450") inspired by this Bible passage and personal reflection.

Passage: ${reference} — "${passage.slice(0, 200)}"
Reflection: "${journalEntry.slice(0, 200)}"

Create a SCENIC LANDSCAPE illustration, not abstract blobs. Think of it like a stained glass window or a beautiful book illustration. Examples of what to draw:
- A golden sunrise over rolling hills with a winding path
- Light rays breaking through clouds over a peaceful valley
- A garden scene with detailed flowers, trees, and a gentle stream
- A shepherd on a hillside with soft morning light
- A calm lake reflecting mountains with birds in the sky

Technical requirements:
- Use SVG paths to draw recognizable shapes: mountains, trees, sun/moon, water, clouds, birds, flowers, hills, paths
- Layer elements: background sky gradient, distant mountains, middle-ground hills/trees, foreground details
- Use rich gradients (linearGradient/radialGradient) for sky, water reflections, and light effects
- Color palette: warm golds (#F4A460, #DAA520), soft purples (#9B7DB8, #C8A2D0), sky blues (#87CEEB, #B0C4DE), rose (#E8A0BF), soft greens (#90C4A0, #7DB88C), warm whites (#FFF8DC)
- Add light rays using semi-transparent polygons or lines radiating from the sun
- Include at least 25-30 SVG elements for visual richness
- Use a small amount of feGaussianBlur ONLY on distant background elements for depth, NOT on everything
- NO text elements
- Output ONLY the raw SVG code, starting with <svg and ending with </svg>`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Claude SVG generation error:", err);
      return NextResponse.json(
        { error: "Failed to generate artwork" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Extract SVG from response
    const svgMatch = text.match(/<svg[\s\S]*<\/svg>/);
    if (!svgMatch) {
      console.error("No SVG found in response");
      return NextResponse.json(
        { error: "Failed to parse artwork" },
        { status: 500 }
      );
    }

    const svgCode = svgMatch[0];

    // Convert SVG to a data URL so it can be displayed as an image
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgCode).toString("base64")}`;

    // Save to bible_journal
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("bible_journal")
      .update({ artwork_url: svgDataUrl })
      .eq("user_id", user.id)
      .eq("date", today);

    return NextResponse.json({ imageUrl: svgDataUrl, svg: svgCode });
  } catch (error) {
    console.error("Artwork generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate artwork" },
      { status: 500 }
    );
  }
}
