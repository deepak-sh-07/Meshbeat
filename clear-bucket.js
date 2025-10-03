import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function clearBucket() {
  const bucket = process.env.AWS_BUCKET_NAME;
console.log("Using region:", process.env.AWS_REGION);
  try {
    // 1. List all objects
    const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
    if (!list.Contents || list.Contents.length === 0) {
      console.log("Bucket already empty");
      return;
    }

    // 2. Prepare delete request
    const deleteParams = {
      Bucket: bucket,
      Delete: {
        Objects: list.Contents.map(obj => ({ Key: obj.Key })),
      },
    };

    // 3. Delete all
    await s3.send(new DeleteObjectsCommand(deleteParams));
    console.log("✅ All objects deleted successfully");
  } catch (err) {
    console.error("Error deleting bucket contents:", err);
  }
}

clearBucket();
