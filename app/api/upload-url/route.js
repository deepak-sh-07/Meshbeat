import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Client() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("❌ Missing AWS credentials in environment variables");
  }
  if (!process.env.AWS_BUCKET_NAME || !process.env.AWS_REGION) {
    throw new Error("❌ Missing AWS bucket config (AWS_BUCKET_NAME / AWS_REGION)");
  }

  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

export async function GET(req) {
  try {
    const s3 = getS3Client(); // ✅ runtime only

    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("fileName");
    const roomId = searchParams.get("roomId");
    const action = searchParams.get("action"); // "upload" or "download"
    const fileType = searchParams.get("fileType");

    if (!fileName || !roomId) {
      return new Response(JSON.stringify({ error: "Missing params" }), { status: 400 });
    }

    let command;

    if (action === "upload") {
      if (!fileType) {
        return new Response(JSON.stringify({ error: "Missing fileType for upload" }), { status: 400 });
      }
      command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${roomId}/${fileName}`, // ✅ backticks inside handler
        ContentType: fileType,
      });
    } else if (action === "download") {
      command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${roomId}/${fileName}`,
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
    }

    const url = await getSignedUrl(s3, command, { expiresIn: 60 });
    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Signed URL error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
