// app/api/tracks/route.js
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return Response.json({ error: "Missing roomId" }, { status: 400 });
    }

    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME,
      Prefix: `${roomId}/`, // only list files under this room
    });

    const data = await s3.send(command);

    const files =
      data.Contents?.length > 0
        ? await Promise.all(
            data.Contents.map(async (file) => {
              const getCommand = new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: file.Key,
              });

              // Generate presigned GET URL (valid 1 hour)
              const signedUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

              return {
                key: file.Key,
                url: signedUrl,
              };
            })
          )
        : [];

    return Response.json({ files });
  } catch (err) {
    console.error("❌ List Tracks Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
