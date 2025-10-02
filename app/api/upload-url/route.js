import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ✅ Fail-fast guard for missing env vars
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("❌ Missing AWS credentials in environment variables");
}
if (!process.env.AWS_BUCKET_NAME || !process.env.AWS_REGION) {
  throw new Error("❌ Missing AWS bucket config (AWS_BUCKET_NAME / AWS_REGION)");
}

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
    const fileName = searchParams.get("fileName");
    const roomId = searchParams.get("roomId");
    const action = searchParams.get("action"); // "upload" or "download"
    const fileType = searchParams.get("fileType");

    if (!fileName || !roomId) {
      return Response.json({ error: "Missing params" }, { status: 400 });
    }

    let command;

    if (action === "upload") {
      if (!fileType) {
        return Response.json({ error: "Missing fileType for upload" }, { status: 400 });
      }
      command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${roomId}/${fileName}`,
        ContentType: fileType,
      });
    } else if (action === "download") {
      command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${roomId}/${fileName}`,
      });
    } else {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const url = await getSignedUrl(s3, command, { expiresIn: 60 });
    return Response.json({ url });
  } catch (err) {
    console.error("❌ Signed URL error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
