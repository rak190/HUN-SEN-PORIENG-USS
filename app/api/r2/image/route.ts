import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '@/lib/cloudflare-r2';
import { getServerAuth } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const { user } = await getServerAuth();
  const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!isDemo && !user) {
    return new NextResponse('Unauthorized: Session required to access media', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (!key) {
    return new NextResponse('Missing key parameter', { status: 400 });
  }

  try {
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
