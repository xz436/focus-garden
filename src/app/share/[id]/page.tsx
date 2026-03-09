import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import SharePageClient from "./SharePageClient";

interface SharePageProps {
  params: Promise<{ id: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("shared_snapshots")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    notFound();
  }

  return (
    <SharePageClient
      displayName={data.display_name}
      snapshotData={data.snapshot_data}
      createdAt={data.created_at}
    />
  );
}
