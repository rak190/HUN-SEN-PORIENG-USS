import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

// Instantiate S3Client once
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function POST(req: Request) {
  try {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      console.error('Missing Cloudflare R2 Environment Variables.');
      return NextResponse.json({ error: 'Storage configuration error' }, { status: 500 });
    }

    const body = await req.json();
    const { fileName, fileType } = body;

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Missing fileName or fileType' }, { status: 400 });
    }

    // Clean up filename and ensure it is unique
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${cleanFileName}`;
    const objectKey = `student-profiles/${uniqueFileName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Construct the public URL where the image will be accessible after upload
    // R2_PUBLIC_URL must not have a trailing slash
    const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${objectKey}`;

    return NextResponse.json({
      presignedUrl,
      publicUrl,
      objectKey,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
