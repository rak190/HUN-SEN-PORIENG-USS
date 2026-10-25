import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Student Photo Upload & Study Plans Integration Suite', () => {
  const rootDir = process.cwd();
  const presignRoutePath = path.join(rootDir, 'app', 'api', 's3-presign', 'route.ts');
  const studentsActionsPath = path.join(rootDir, 'app', '(dashboard)', 'students', 'actions.ts');
  const bulkModalPath = path.join(rootDir, 'components', 'students', 'BulkImageUploadModal.tsx');
  const studentsPagePath = path.join(rootDir, 'app', '(dashboard)', 'students', 'page.tsx');
  const docPath = path.join(rootDir, 'app', '(dashboard)', 'homeroom', 'student-study-plans', 'StudentStudyPlanDocument.tsx');
  const clientPath = path.join(rootDir, 'app', '(dashboard)', 'homeroom', 'student-study-plans', 'StudentStudyPlansClient.tsx');
  const migrationPath = path.join(rootDir, 'supabase', 'migrations', '086_add_photo_url_to_save_student_atomic.sql');

  test('Scenario 1: /api/s3-presign supports Supabase Storage fallback for student-profiles bucket', () => {
    assert.ok(fs.existsSync(presignRoutePath), 's3-presign route.ts must exist');
    const content = fs.readFileSync(presignRoutePath, 'utf-8');

    // Supabase fallback integration
    assert.ok(
      content.includes("from('student-profiles')") || content.includes("bucketName = 'student-profiles'"),
      'Must define student-profiles bucket fallback'
    );
    assert.ok(
      content.includes('createSignedUploadUrl'),
      'Must generate signed upload URL via Supabase Storage'
    );
    assert.ok(
      content.includes('getPublicUrl'),
      'Must resolve public CDN URL for uploaded student photo'
    );
    assert.ok(
      content.includes('createAdminClient'),
      'Must use createAdminClient to ensure reliable storage permissions'
    );
  });

  test('Scenario 2: saveStudentAction persists photo_url and revalidates study plans', () => {
    assert.ok(fs.existsSync(studentsActionsPath), 'students/actions.ts must exist');
    const content = fs.readFileSync(studentsActionsPath, 'utf-8');

    // photo_url mapping in saveStudentAction
    assert.ok(
      content.includes('(validatedPayload as any).photo_url') || content.includes('validatedPayload.photo_url'),
      'Must check photo_url from validatedPayload in saveStudentAction'
    );
    assert.ok(
      content.includes("update({ photo_url: photoUrlToSave"),
      'Must update photo_url in public.students table'
    );
    assert.ok(
      content.includes("revalidatePath('/homeroom/student-study-plans')"),
      'Must revalidate /homeroom/student-study-plans on student save'
    );
  });

  test('Scenario 3: Authoritative single and batch photo server actions enforce authorization and boundaries', () => {
    const content = fs.readFileSync(studentsActionsPath, 'utf-8');

    // updateStudentPhotoAction
    assert.ok(
      content.includes('export async function updateStudentPhotoAction'),
      'Must export updateStudentPhotoAction server action'
    );
    assert.ok(
      content.includes('requireClassAccess(payload.classId)'),
      'Must enforce requireClassAccess for teacher caller in photo action'
    );

    // batchUpdateStudentPhotosAction
    assert.ok(
      content.includes('export async function batchUpdateStudentPhotosAction'),
      'Must export batchUpdateStudentPhotosAction server action'
    );
    assert.ok(
      content.includes('student_enrollments') && content.includes('enrolledIds.has'),
      'Must verify every student in batch belongs to caller class roster'
    );
  });

  test('Scenario 4: BulkImageUploadModal wires server action and /students refreshes roster on complete', () => {
    assert.ok(fs.existsSync(bulkModalPath), 'BulkImageUploadModal.tsx must exist');
    const modalContent = fs.readFileSync(bulkModalPath, 'utf-8');

    // Must use batchUpdateStudentPhotosAction instead of direct browser update
    assert.ok(
      modalContent.includes('batchUpdateStudentPhotosAction'),
      'BulkImageUploadModal must call batchUpdateStudentPhotosAction'
    );
    assert.ok(
      modalContent.includes('classId?: string') || modalContent.includes('classId'),
      'BulkImageUploadModal must accept classId prop'
    );

    // Page must wire classId, invalidate cache and re-fetch students
    assert.ok(fs.existsSync(studentsPagePath), 'students/page.tsx must exist');
    const pageContent = fs.readFileSync(studentsPagePath, 'utf-8');
    assert.ok(
      pageContent.includes('classId={activeClass?.id}'),
      'StudentsPage must pass activeClass.id to BulkImageUploadModal'
    );
    assert.ok(
      pageContent.includes('fetchStudents(true)'),
      'StudentsPage must call fetchStudents(true) on upload complete'
    );
    assert.ok(
      pageContent.includes('invalidateClassRoster(activeClass.id)'),
      'StudentsPage must invalidate class roster cache on upload complete'
    );
  });

  test('Scenario 5: /homeroom/student-study-plans renders student photo with proper dimensions and fallback', () => {
    assert.ok(fs.existsSync(docPath), 'StudentStudyPlanDocument.tsx must exist');
    const docContent = fs.readFileSync(docPath, 'utf-8');

    // Study plan printable document photo frame
    assert.ok(
      docContent.includes('student.photo_url'),
      'Document must bind student.photo_url'
    );
    assert.ok(
      docContent.includes('w-[102px] h-[132px]'),
      'Photo frame must follow standard 3x4 aspect ratio (102px by 132px)'
    );
    assert.ok(
      docContent.includes('onError='),
      'Image must have onError fallback handler for network resilience'
    );
    assert.ok(
      docContent.includes('photo-fallback'),
      'Must contain fallback element for image error / missing photo'
    );

    // Client component roster thumbnail
    assert.ok(fs.existsSync(clientPath), 'StudentStudyPlansClient.tsx must exist');
    const clientContent = fs.readFileSync(clientPath, 'utf-8');
    assert.ok(
      clientContent.includes('std.photo_url'),
      'Client must bind std.photo_url in student selector list'
    );
    assert.ok(
      clientContent.includes('thumb-fallback'),
      'Client must provide thumbnail fallback element'
    );
  });

  test('Scenario 6: Migration 086 adds photo_url to save_student_atomic RPC', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration 086 must exist');
    const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

    assert.ok(
      migrationContent.includes("photo_url = CASE WHEN p_student ? 'photo_url'"),
      'Must update photo_url on student update in save_student_atomic'
    );
    assert.ok(
      migrationContent.includes("NULLIF(p_student->>'photo_url', '')"),
      'Must insert photo_url on new student creation in save_student_atomic'
    );
  });

  test('Scenario 7: /api/upload-student-photo provides zero-CORS direct upload and smart Khmer matching', () => {
    const uploadRoutePath = path.join(rootDir, 'app', 'api', 'upload-student-photo', 'route.ts');
    assert.ok(fs.existsSync(uploadRoutePath), '/api/upload-student-photo route must exist');
    const uploadContent = fs.readFileSync(uploadRoutePath, 'utf-8');

    assert.ok(uploadContent.includes('getServerAuth'), 'Must authenticate user session');
    assert.ok(uploadContent.includes("bucketName = 'student-profiles'"), 'Must upload to student-profiles bucket');
    assert.ok(uploadContent.includes('revalidatePath'), 'Must revalidate affected paths');

    // Check BulkImageUploadModal uses normalized Khmer name matching and direct upload
    const modalContent = fs.readFileSync(bulkModalPath, 'utf-8');
    assert.ok(
      modalContent.includes('normalizeText'),
      'BulkImageUploadModal must normalize Khmer numerals and prefixes'
    );
    assert.ok(
      modalContent.includes('/api/upload-student-photo'),
      'BulkImageUploadModal must use same-origin /api/upload-student-photo route'
    );

    // Check StudentProfileDrawer uses same-origin upload
    const drawerPath = path.join(rootDir, 'components', 'students', 'StudentProfileDrawer.tsx');
    const drawerContent = fs.readFileSync(drawerPath, 'utf-8');
    assert.ok(
      drawerContent.includes('/api/upload-student-photo'),
      'StudentProfileDrawer must use /api/upload-student-photo'
    );
  });
});
