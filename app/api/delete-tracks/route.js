// /app/api/delete-track/route.js
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function DELETE(req) {
  try {
    const { trackId } = await req.json();

    // 1️⃣ Fetch the track info from DB
    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    // 2️⃣ Get stored Supabase file key/path
    // (Replace `track.s3Key` with whatever you called it in your schema, e.g. `storagePath`)
    const filePath = track.storagePath || track.s3Key;
    if (!filePath) {
      return NextResponse.json({ error: "No file path found for track" }, { status: 400 });
    }

    // 3️⃣ Delete the file from Supabase Storage
    const { error: deleteError } = await supabase.storage.from("songs").remove([filePath]);
    if (deleteError) throw deleteError;

    // 4️⃣ Delete the record from DB
    await prisma.track.delete({ where: { id: trackId } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Supabase delete error:", err);
    return NextResponse.json({ error: "Failed to delete track" }, { status: 500 });
  }
}
