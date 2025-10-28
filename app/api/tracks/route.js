// app/api/tracks/route.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return Response.json({ error: "Missing roomId" }, { status: 400 });
    }

    // 1️⃣ List all files inside the folder (like S3 Prefix)
    const { data: files, error } = await supabase.storage
      .from("Songs")
      .list(roomId, { limit: 100, sortBy: { column: "name", order: "asc" } });

    if (error) throw error;

    // 2️⃣ Map each file to its public URL
    // (if your bucket is private, we'll switch this to signed URLs)
    const fileList = files.map((file) => ({
      key: `${roomId}/${file.name}`,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/Songs/${roomId}/${file.name}`,
    }));

    return Response.json({ files: fileList });
  } catch (err) {
    console.error("❌ Supabase List Tracks Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
