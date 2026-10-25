import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getServerAuth, requireClassAccess } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'porieng-uss-storage';

const isR2Configured = Boolean(
  R2_ACCOUNT_ID &&
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY
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

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    // 1. Authoritative Server-Side Authentication
    const { user, profile, role } = await getServerAuth();
    if (!user || !profile || !role) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    if (!['admin', 'principal', 'teacher'].includes(role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient privileges.' },
        { status: 403 }
      );
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const studentId = (formData.get('studentId') as string | null)?.trim() || null;
    const classId = (formData.get('classId') as string | null)?.trim() || null;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file: No image file provided.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type (${file.type}). Allowed types: JPG, PNG, WEBP.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed limit (5MB).' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 3. Authorization Guards (Teacher scope checks)
    if (role === 'teacher') {
      if (classId) {
        try {
          await requireClassAccess(classId);
        } catch (err: any) {
          return NextResponse.json(
            { error: err?.message || 'Forbidden: Access to class denied.' },
            { status: 403 }
          );
        }
      }

      if (studentId) {
        // Verify student belongs to caller's class roster
        const { data: enrollment } = await supabaseAdmin
          .from('student_enrollments')
          .select('class_id, classes!inner(teacher_id)')
          .eq('student_id', studentId)
          .eq('classes.teacher_id', user.id)
          .maybeSingle();

        if (!enrollment && !classId) {
          return NextResponse.json(
            { error: 'Forbidden: Student is not in any class taught by you.' },
            { status: 403 }
          );
        }
      }
    }

    // 4. Prepare File Buffer & Unique Name
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let ext = 'webp';
    if (file.type === 'image/jpeg') ext = 'jpg';
    else if (file.type === 'image/png') ext = 'png';

    const safeStudentPrefix = studentId ? studentId.replace(/[^a-zA-Z0-9-]/g, '') : 'unassigned';
    const uniqueFileName = `${safeStudentPrefix}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // 5. Primary Storage: Supabase Storage ('student-profiles' public bucket)
    const bucketName = 'student-profiles';
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = (buckets || []).some((b) => b.name === bucketName || b.id === bucketName);
    if (!exists) {
      await supabaseAdmin.storage.createBucket(bucketName, { public: true });
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(uniqueFileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[UploadStudentPhoto] Supabase upload failed:', uploadError);
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: pubData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(uniqueFileName);

    const publicUrl = pubData.publicUrl;

    // 6. Secondary Storage: Cloudflare R2 (Server-to-Server Sync for redundancy)
    if (isR2Configured && s3Client) {
      try {
        const r2Key = `student-profiles/${uniqueFileName}`;
        await s3Client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: r2Key,
            Body: buffer,
            ContentType: file.type,
          })
        );
      } catch (r2Err) {
        // Cloudflare R2 failure does not block client since Supabase storage succeeded
        console.warn('[UploadStudentPhoto] Cloudflare R2 backup upload skipped/failed:', r2Err);
      }
    }

    // 7. Authoritatively Update Database if studentId is provided
    if (studentId) {
      const nowIso = new Date().toISOString();
      const { error: updateErr } = await supabaseAdmin
        .from('students')
        .update({
          photo_url: publicUrl,
          updated_at: nowIso,
        })
        .eq('id', studentId);

      if (updateErr) {
        console.error('[UploadStudentPhoto] Failed to update student photo_url:', updateErr);
        return NextResponse.json(
          { error: `Database update failed: ${updateErr.message}` },
          { status: 500 }
        );
      }

      // Record Audit Log Entry
      try {
        await supabaseAdmin.from('audit_logs').insert([{
          action: `បានបញ្ចូល/ផ្លាស់ប្តូររូបភាពសិស្ស (ID: ${studentId})`,
          type: 'info',
          user_id: user.id,
          school_id: profile.school_id,
          target_table: 'students',
          record_id: studentId,
          details: {
            student_id: studentId,
            photo_url: publicUrl,
            file_name: uniqueFileName,
            file_size: file.size,
          },
          status: 'success',
        }]);
      } catch (auditErr) {
        console.warn('[UploadStudentPhoto] Audit log warning:', auditErr);
      }
    }

    // 8. Revalidate Relevant Next.js Paths
    revalidatePath('/students');
    if (studentId) {
      revalidatePath(`/students/${studentId}`);
    }
    revalidatePath('/homeroom/student-study-plans');
    revalidatePath('/homeroom/profiling');
    revalidatePath('/homeroom');
    revalidatePath('/classes/info');

    return NextResponse.json({
      success: true,
      photoUrl: publicUrl,
      studentId,
      fileName: uniqueFileName,
    });
  } catch (err: any) {
    console.error('[UploadStudentPhoto] Unhandled server error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error while uploading student photo.' },
      { status: 500 }
    );
  }
}
