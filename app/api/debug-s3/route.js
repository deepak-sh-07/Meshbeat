import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET() {
  try {
    // List all files inside the "songs" bucket (root level)
    const { data, error } = await supabase.storage.from("songs").list("", {
      limit: 100, // adjust as needed
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw error;

    // Build full public URLs for each file
    const files = data.map((file) => ({
      name: file.name,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/songs/${file.name}`,
      size: file.metadata?.size || file.size || 0,
      lastModified: file.updated_at,
    }));

    return NextResponse.json({ files });
  } catch (err) {
    console.error("Supabase list error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
