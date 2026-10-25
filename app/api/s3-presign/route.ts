import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getServerAuth } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

const isR2Configured = Boolean(
  R2_ACCOUNT_ID &&
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY &&
  R2_BUCKET_NAME
);

const s3Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

export async function POST(req: Request) {
  try {
    // 1. Verify User Session
    const { user } = await getServerAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to upload files.' }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileType } = body;

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Missing fileName or fileType' }, { status: 400 });
    }

    // 2. Validate file extension and type
    const ext = fileName.slice(((fileName.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
    const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
    if (!ALLOWED_EXTENSIONS.includes(ext) || !fileType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are allowed on this endpoint.' }, { status: 400 });
    }

    // Clean up filename and ensure it is unique
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${cleanFileName}`;

    // 3. Provider Resolution: Prefer R2 if configured, otherwise fallback seamlessly to Supabase Storage
    if (isR2Configured && s3Client) {
      try {
        const objectKey = `student-profiles/${uniqueFileName}`;
        const command = new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: objectKey,
          ContentType: fileType,
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${objectKey}`;

        return NextResponse.json({
          presignedUrl,
          publicUrl,
          objectKey,
          provider: 'r2',
        });
      } catch (r2Error) {
        console.warn('Cloudflare R2 presign failed, falling back to Supabase Storage:', r2Error);
      }
    }

    // Supabase Storage Fallback (Active and Verified 'student-profiles' Bucket)
    const supabaseAdmin = createAdminClient();
    const bucketName = 'student-profiles';

    // Ensure bucket exists or create as public
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = (buckets || []).some((b) => b.name === bucketName || b.id === bucketName);
    if (!exists) {
      await supabaseAdmin.storage.createBucket(bucketName, { public: true });
    }

    const { data: signData, error: signError } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUploadUrl(uniqueFileName);

    if (signError || !signData) {
      console.error('Supabase signed upload URL generation error:', signError);
      return NextResponse.json({ error: 'Failed to generate signed upload URL from storage' }, { status: 500 });
    }

    const { data: pubData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(uniqueFileName);

    return NextResponse.json({
      presignedUrl: signData.signedUrl,
      publicUrl: pubData.publicUrl,
      objectKey: uniqueFileName,
      provider: 'supabase',
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
