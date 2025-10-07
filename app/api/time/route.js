// app/api/time/route.js
export async function GET(request) {
  const currentTime = new Date().toISOString();
  return new Response(JSON.stringify({ time: currentTime }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
