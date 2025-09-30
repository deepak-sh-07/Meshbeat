// /app/api/delete-track/route.js (Next.js 13+ app router)
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function DELETE(req) {
  try {
    const { trackId } = await req.json();

    // Get track info from DB (to know S3 key)
    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) {
      return new Response(JSON.stringify({ error: "Track not found" }), { status: 404 });
    }

    const key = track.s3Key; // store S3 key when uploading

    // Delete from S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      })
    );

    // Delete from DB
    await prisma.track.delete({ where: { id: trackId } });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Failed to delete track" }), { status: 500 });
  }
}
