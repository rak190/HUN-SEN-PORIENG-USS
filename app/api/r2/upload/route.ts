import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME } from '@/lib/cloudflare-r2';
import { getServerAuth, requireClassAccess } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_EXTENSIONS = ['.pdf', '.xlsx', '.xls', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.webp', '.zip', '.rar'];

export async function POST(req: NextRequest) {
  try {
    // 1. Verify User Session
    const { user } = await getServerAuth();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to upload files.' }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileType, category, classId } = body;

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Missing fileName or fileType' }, { status: 400 });
    }

    if (classId) {
      try {
        await requireClassAccess(classId);
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Forbidden class access' }, { status: 403 });
      }
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

    // 3. Register document as pending in database
    const supabase = await createClient();
    let documentType = 'other';
    if (ext === 'pdf') documentType = 'pdf';
    else if (['xlsx', 'xls'].includes(ext)) documentType = 'excel';
    else if (['docx', 'doc'].includes(ext)) documentType = 'word';
    else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) documentType = 'image';
    else if (['zip', 'rar'].includes(ext)) documentType = 'archive';

    const { error: dbErr } = await supabase.from('documents').insert({
      id: uniqueId,
      title: cleanFileName,
      file_url: objectKey,
      type: documentType,
      category: category || 'upload',
      uploader_id: user.id,
      class_id: classId || null,
      size: '0',
      status: 'pending'
    });

    if (dbErr) {
      throw new Error(`Failed to register document: ${dbErr.message}`);
    }

    // 4. Create PutObjectCommand
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: fileType || 'application/octet-stream',
    });

    // 5. Generate Pre-signed URL (expires in 5 minutes)
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
