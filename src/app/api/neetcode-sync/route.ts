import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { problem_name, problem_number, problem_slug } = body;

    if (!problem_name && !problem_number) {
      return NextResponse.json({ error: "Missing problem info" }, { status: 400, headers: corsHeaders });
    }

    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    // Query the correct table name
    const { data: problems } = await supabase
      .from("blind75_problems")
      .select("*")
      .eq("user_id", user.id);

    if (!problems || problems.length === 0) {
      return NextResponse.json({
        success: true,
        problem: problem_name,
        message: `Problem "${problem_name}" noted (no tracker data found)`,
      }, { headers: corsHeaders });
    }

    // Find matching problem by leetcode number, name, or slug
    const normalizedName = problem_name?.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedSlug = problem_slug?.toLowerCase().replace(/-/g, "");
    const matched = problems.find(
      (p: { problem_name: string; leetcode_number?: number }) => {
        // Match by leetcode number
        if (problem_number && p.leetcode_number === problem_number) return true;
        // Match by exact name
        const pNorm = p.problem_name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (pNorm === normalizedName) return true;
        // Match by slug (e.g. "combination-target-sum" matches "Combination Sum")
        if (normalizedSlug && pNorm === normalizedSlug) return true;
        // Partial match: slug words in problem name
        if (problem_slug) {
          const slugWords = problem_slug.split("-");
          const nameWords = p.problem_name.toLowerCase().split(/\s+/);
          const matchCount = slugWords.filter((w: string) => nameWords.includes(w)).length;
          if (matchCount >= Math.min(slugWords.length, nameWords.length) && matchCount >= 2) return true;
        }
        return false;
      }
    );

    if (matched) {
      await supabase
        .from("blind75_problems")
        .update({
          status: "solved",
          solved_at: new Date().toISOString(),
        })
        .eq("id", matched.id);

      return NextResponse.json({
        success: true,
        problem: matched.problem_name,
        matched: true,
        message: `Marked "${matched.problem_name}" as solved!`,
      }, { headers: corsHeaders });
    }

    return NextResponse.json({
      success: true,
      problem: problem_name,
      matched: false,
      message: `Problem "${problem_name}" synced (not found in tracker)`,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("NeetCode sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500, headers: corsHeaders }
    );
  }
}
