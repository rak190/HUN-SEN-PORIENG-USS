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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Log in required' }, { status: 401 });
    }

    // 2. Object-level access verification
    const supabase = await createClient();
    const { data: doc } = await supabase
      .from('documents')
      .select('id, class_id, uploader_id, category')
      .eq('file_url', objectKey)
      .maybeSingle();

    if (!doc) {
      return NextResponse.json({ error: 'Not Found: Object metadata is missing.' }, { status: 404 });
    }

    if (role === 'principal') {
      const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();
      if (doc.class_id) {
        const { data: cls } = await supabase.from('classes').select('school_id').eq('id', doc.class_id).maybeSingle();
        if (cls?.school_id !== profile?.school_id) {
          return NextResponse.json({ error: 'Forbidden: Document belongs to another school' }, { status: 403 });
        }
      } else {
        // If no class, assume school-wide or personal, but check if uploader is in same school
        const { data: uploader } = await supabase.from('profiles').select('school_id').eq('id', doc.uploader_id).maybeSingle();
        if (uploader?.school_id !== profile?.school_id && doc.category !== 'template') {
          return NextResponse.json({ error: 'Forbidden: Document belongs to another school' }, { status: 403 });
        }
      }
    }

    if (role !== 'admin' && role !== 'principal' && doc.category !== 'template') {
      // If document is indexed in DB and uploader is different, verify class access
      if (doc.uploader_id !== user.id) {
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
