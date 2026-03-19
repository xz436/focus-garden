import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { problem_name, problem_number, problem_slug } = await request.json();

    if (!problem_name && !problem_number) {
      return NextResponse.json({ error: "Missing problem info" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to find the problem in the user's tracker by name or leetcode number
    // We store problems in localStorage, but the sync also goes to Supabase
    // The extension calls this API, and we update the Supabase problems table

    // Check if we have a problems table entry for this user
    const { data: problems } = await supabase
      .from("problems")
      .select("*")
      .eq("user_id", user.id);

    if (!problems) {
      return NextResponse.json({ error: "No problems found" }, { status: 404 });
    }

    // Find matching problem by leetcode number or name (fuzzy)
    const normalizedName = problem_name?.toLowerCase().replace(/[^a-z0-9]/g, "");
    let matched = problems.find(
      (p: { problem_name: string; leetcode_number?: number }) =>
        (problem_number && p.leetcode_number === problem_number) ||
        p.problem_name.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedName
    );

    if (matched) {
      // Update status to solved
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
      });
    }

    return NextResponse.json({
      success: true,
      problem: problem_name,
      message: `Problem "${problem_name}" synced (not in NeetCode 150 list)`,
    });
  } catch (error) {
    console.error("NeetCode sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
