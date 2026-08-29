import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME } from '@/lib/cloudflare-r2';
import { getServerAuth } from '@/lib/auth-server';

const ALLOWED_EXTENSIONS = ['.pdf', '.xlsx', '.xls', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.webp', '.zip', '.rar'];

export async function POST(req: NextRequest) {
  try {
    // 1. Verify User Session
    const { user } = await getServerAuth();
    
    // In strict production, ensure user session exists
    const isLocalDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!isLocalDemo && !user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to upload files.' }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileType } = body;

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Missing fileName or fileType' }, { status: 400 });
    }

    // Validate file extension against allowed whitelist
    const ext = fileName.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
    const isAllowedExt = ALLOWED_EXTENSIONS.some(allowed => `.${ext}` === allowed || fileName.toLowerCase().endsWith(allowed));

    if (!isAllowedExt) {
      return NextResponse.json({ 
        error: `ប្រភេទឯកសារមិនត្រូវបានអនុញ្ញាតទេ (.${ext})។ អនុញ្ញាតតែ: PDF, Excel, Word, Image, ZIP ប៉ុណ្ណោះ។` 
      }, { status: 400 });
    }

    // 2. Generate unique R2 object key
    const uniqueId = crypto.randomUUID();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `uploads/${uniqueId}-${cleanFileName}`;

    // 3. Create PutObjectCommand
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: fileType || 'application/octet-stream',
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
