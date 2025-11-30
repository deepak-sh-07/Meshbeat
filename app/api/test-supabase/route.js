// app/api/test-supabase/route.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET() {
  try {
    // Test 1: List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) throw bucketsError;
    
    return Response.json({ 
      success: true,
      buckets: buckets,
      message: "Supabase connection working!"
    });
  } catch (err) {
    return Response.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 });
  }
}