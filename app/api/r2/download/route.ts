import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME } from '@/lib/cloudflare-r2';
import { getServerAuth } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { user, role } = await getServerAuth();
    const searchParams = req.nextUrl.searchParams;
    const objectKey = searchParams.get('key');

    if (!objectKey) {
      return NextResponse.json({ error: 'Missing object key' }, { status: 400 });
    }

    // 1. Verify User Session
    const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!isDemo && !user) {
      return NextResponse.json({ error: 'Unauthorized: Log in required' }, { status: 401 });
    }

    // 2. Object-level access verification (Admins/Principals have full access; Teachers have school access)
    if (!isDemo && user && role !== 'admin' && role !== 'principal') {
      const supabase = await createClient();
      const { data: doc } = await supabase
        .from('documents')
        .select('id, class_id, uploader_id')
        .eq('file_url', objectKey)
        .maybeSingle();

      // If document is indexed in DB and uploader is different, verify class access
      if (doc && doc.uploader_id !== user.id) {
        const { data: teacherClass } = await supabase
          .from('classes')
          .select('id')
          .eq('teacher_id', user.id)
          .eq('id', doc.class_id)
          .maybeSingle();

        if (!teacherClass) {
          return NextResponse.json({ error: 'Forbidden: Access to this document is restricted' }, { status: 403 });
        }
      }
    }

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
