// app/api/tracks/route.js
import { createClient } from "@supabase/supabase-js";

// Debug logging
console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("Has Anon Key:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
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
      .list(roomId, { 
        limit: 100, 
        sortBy: { column: "name", order: "asc" } 
      });

    // 2️⃣ Handle case where folder doesn't exist or is empty
    if (error) {
      // If folder doesn't exist, return empty array instead of error
      if (error.message?.includes("not found") || error.message?.includes("does not exist")) {
        console.log(`ℹ️ Room folder ${roomId} doesn't exist yet, returning empty playlist`);
        return Response.json({ files: [] });
      }
      
      console.error("❌ Supabase List Error:", error);
      throw error;
    }

    // 3️⃣ Filter out folders (only keep files) and map to URLs
    const actualFiles = files.filter(file => file.id !== null); // folders have null id
    
    const fileList = actualFiles.map((file) => ({
      id: file.id,
      key: `${roomId}/${file.name}`,
      name: file.name,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/Songs/${roomId}/${encodeURIComponent(file.name)}`,
    }));

    console.log(`✅ Fetched ${fileList.length} tracks for room ${roomId}`);
    return Response.json({ files: fileList });
    
  } catch (err) {
    console.error("❌ Supabase List Tracks Error:", err);
    return Response.json(
      { error: err.message || "Failed to fetch tracks" }, 
      { status: 500 }
    );
  }
}