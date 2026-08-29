import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '@/lib/cloudflare-r2';
import { getServerAuth } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { user, role } = await getServerAuth();
  
  if (!user) {
    return new NextResponse('Unauthorized: Session required to access media', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (!key) {
    return new NextResponse('Missing key parameter', { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: doc } = await supabase
      .from('documents')
      .select('id, class_id, uploader_id, category')
      .eq('file_url', key)
      .maybeSingle();

    if (!doc) {
      return new NextResponse('Not Found: Object metadata is missing.', { status: 404 });
    }

    if (role !== 'admin' && role !== 'principal' && doc.category !== 'template') {
      if (doc.uploader_id !== user.id) {
        const { data: teacherClass } = await supabase
          .from('classes')
          .select('id')
          .eq('teacher_id', user.id)
          .eq('id', doc.class_id)
          .maybeSingle();

        if (!teacherClass) {
          return new NextResponse('Forbidden: Access to this image is restricted', { status: 403 });
        }
      }
    }

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);

    if (!response.Body) {
      throw new Error('No body returned from R2');
    }

    // Convert the AWS SDK stream to a Web Stream for Next.js response
    const stream = (response.Body as any).transformToWebStream();

    return new NextResponse(stream, {
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error fetching image from R2:', error);
    return new NextResponse(error.message || 'Error fetching image', { status: 500 });
  }
}
