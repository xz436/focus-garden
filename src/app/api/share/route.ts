import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

function generateShareId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, snapshotData } = body;

    if (!snapshotData) {
      return NextResponse.json(
        { error: "Missing snapshot data" },
        { status: 400 }
      );
    }

    const shareId = generateShareId();

    const { error } = await supabase.from("shared_snapshots").insert({
      id: shareId,
      user_id: user.id,
      display_name: displayName || "Focus Gardener",
      snapshot_data: snapshotData,
      expires_at: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(), // 30 days
    });

    if (error) {
      console.error("Share insert error:", error);
      return NextResponse.json(
        { error: "Failed to create share" },
        { status: 500 }
      );
    }

    return NextResponse.json({ shareId });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("shared_snapshots")
      .select("id, display_name, created_at, expires_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch shares" },
        { status: 500 }
      );
    }

    return NextResponse.json({ shares: data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get("id");

    if (!shareId) {
      return NextResponse.json(
        { error: "Missing share ID" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("shared_snapshots")
      .delete()
      .eq("id", shareId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete share" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
