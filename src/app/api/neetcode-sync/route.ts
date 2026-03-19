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
    const { problem_name, problem_number } = body;

    if (!problem_name && !problem_number) {
      return NextResponse.json({ error: "Missing problem info" }, { status: 400, headers: corsHeaders });
    }

    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    // Check if we have a problems table entry for this user
    const { data: problems } = await supabase
      .from("problems")
      .select("*")
      .eq("user_id", user.id);

    if (!problems) {
      return NextResponse.json({ error: "No problems found" }, { status: 404, headers: corsHeaders });
    }

    // Find matching problem by leetcode number or name (fuzzy)
    const normalizedName = problem_name?.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matched = problems.find(
      (p: { problem_name: string; leetcode_number?: number }) =>
        (problem_number && p.leetcode_number === problem_number) ||
        p.problem_name.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedName
    );

    if (matched) {
      await supabase
        .from("problems")
        .update({
          status: "solved",
          solved_at: new Date().toISOString(),
        })
        .eq("id", matched.id);

      return NextResponse.json({
        success: true,
        problem: matched.problem_name,
        message: `Marked "${matched.problem_name}" as solved!`,
      }, { headers: corsHeaders });
    }

    return NextResponse.json({
      success: true,
      problem: problem_name,
      message: `Problem "${problem_name}" synced (not in tracker list)`,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("NeetCode sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500, headers: corsHeaders }
    );
  }
}
