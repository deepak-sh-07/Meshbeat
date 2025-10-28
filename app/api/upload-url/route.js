import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("fileName");
    const fileType = searchParams.get("fileType");
    const roomId = searchParams.get("roomId");

    if (!fileName || !fileType || !roomId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // Construct a full path for organization
    const filePath = `${roomId}/${fileName}`;

    // Generate a signed upload URL (valid for a short time)
    const { data, error } = await supabase.storage
      .from("Songs")
      .createSignedUploadUrl(filePath);

    if (error) throw error;

    return NextResponse.json({
  url: data.signedUrl,   // <-- renamed key
  path: filePath,
});
  } catch (err) {
    console.error("Supabase signed URL error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
