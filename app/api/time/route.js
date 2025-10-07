export async function GET() {
  const currentTime = Date.now(); // ✅ number, not Date
  return new Response(JSON.stringify({ time: currentTime }), {
    headers: { "Content-Type": "application/json" },
  });
}
