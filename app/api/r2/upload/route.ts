import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME } from '@/lib/cloudflare-r2';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    // 1. Verify User Session (Ensure only authenticated users can upload)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // For demo purposes, we allow uploads if in demo mode (no user)
    const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!isDemo && (authError || !user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileType } = body;

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Missing fileName or fileType' }, { status: 400 });
    }

    // 2. Generate unique R2 object key
    const uniqueId = crypto.randomUUID();
    const objectKey = `uploads/${uniqueId}-${fileName.replace(/\s+/g, '-')}`;

    // 3. Create PutObjectCommand
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: fileType,
    });

    // 4. Generate Pre-signed URL (expires in 5 minutes)
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });

    return NextResponse.json({
      url: signedUrl,
      objectKey,
    });
  } catch (error: any) {
    console.error('Error generating pre-signed upload URL:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
