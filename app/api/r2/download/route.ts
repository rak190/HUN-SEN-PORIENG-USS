import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME } from '@/lib/cloudflare-r2';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = req.nextUrl.searchParams;
    const objectKey = searchParams.get('key');

    if (!objectKey) {
      return NextResponse.json({ error: 'Missing object key' }, { status: 400 });
    }

    // 1. Verify User Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Demo mode fallback
    const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!isDemo && (authError || !user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Security Check (Analog to RLS)
    // Normally, you would query Supabase here to ensure the user has access to this objectKey.
    // For example: const { data } = await supabase.from('documents').select('id').eq('r2_object_key', objectKey).single();
    // If no data, return 403 Forbidden.

    // 3. Create GetObjectCommand
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
    });

    // 4. Generate Pre-signed URL (expires in 15 minutes)
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });

    return NextResponse.json({ url: signedUrl });
  } catch (error: any) {
    console.error('Error generating pre-signed download URL:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
