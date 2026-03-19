import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { problem_name, problem_number, problem_slug } = await request.json();

    if (!problem_name && !problem_number) {
      return NextResponse.json({ error: "Missing problem info" }, { status: 400, headers: corsHeaders });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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
      message: `Problem "${problem_name}" synced (not in NeetCode 150 list)`,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("NeetCode sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500, headers: corsHeaders }
    );
  }
}
