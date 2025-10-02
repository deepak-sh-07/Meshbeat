import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function GET() {
  try {
    const data = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME,
    }));

    return Response.json({ files: data.Contents || [] });
  } catch (err) {
    console.error("S3 Debug Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
