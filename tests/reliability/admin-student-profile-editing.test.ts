import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { AdminUpdateStudentSchema } from '@/app/(dashboard)/admin/students/student-edit-schema';

describe('Admin Student Profile Editing Suite', () => {
  const rootDir = process.cwd();
  const actionsPath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'students', 'actions.ts');
  const modalPath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'students', 'components', 'AdminEditStudentModal.tsx');
  const drawerPath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'students', 'components', 'StudentProfileDrawer.tsx');
  const masterClientPath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'students', 'MasterStudentsClient.tsx');

  it('Scenario 1: AdminUpdateStudentSchema rigorously validates and sanitizes input data', () => {
    // 1. Valid full payload
    const validRaw = {
      studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      full_name: 'សុខ គង់',
      student_id_number: 'STU-9901',
      english_name: 'SOK KONG',
      gender: 'ប្រុស' as const,
      dob: '2008-05-15',
      parent_phone: '098765432',
      emergency_contact_phone: '011223344',
      father_name: 'សុខ ចាន់',
      father_job: 'កសិករ',
      father_phone: '098765432',
      mother_name: 'កែវ ណារី',
      mother_job: 'មេផ្ទះ',
      mother_phone: '012998877',
      guardian_name: 'សុខ ចាន់',
      guardian_job: 'កសិករ',
      guardian_phone: '098765432',
      current_address: 'ភូមិ១ ឃុំព្រៃវែង ស្រុកពោធិ៍រៀង ខេត្តព្រៃវែង',
      photo_url: 'https://r2.kru.ai/students/sok-kong.webp',
      status: 'new' as const,
      desk_number: '12',
      room_number: 'R-03',
      id_poor: 'level_1' as const,
      scholarship: 'yes' as const,
      orphan: 'no' as const,
      distance_km: 4.5,
      disability: 'none' as const,
      special_needs_status: 'ត្រូវការការគាំទ្រភាសា',
    };

    const parsed = AdminUpdateStudentSchema.safeParse(validRaw);
    assert.ok(parsed.success, `Valid payload must parse successfully: ${!parsed.success ? JSON.stringify(parsed.error) : ''}`);
    if (parsed.success) {
      assert.equal(parsed.data.full_name, 'សុខ គង់');
      assert.equal(parsed.data.student_id_number, 'STU-9901');
      assert.equal(parsed.data.english_name, 'SOK KONG');
      assert.equal(parsed.data.gender, 'ប្រុស');
      assert.equal(parsed.data.dob, '2008-05-15');
      assert.equal(parsed.data.distance_km, 4.5);
      assert.equal(parsed.data.id_poor, 'level_1');
      assert.equal(parsed.data.scholarship, 'yes');
      assert.equal(parsed.data.disability, 'none');
      assert.equal(parsed.data.special_needs_status, 'ត្រូវការការគាំទ្រភាសា');
    }

    // 2. Reject empty full_name
    const emptyName = AdminUpdateStudentSchema.safeParse({
      studentId: '11111111-1111-1111-1111-111111111111',
      full_name: '   ',
      student_id_number: 'STU-001',
      gender: 'ស្រី',
      dob: '2008-01-01',
    });
    assert.equal(emptyName.success, false, 'Empty full_name must fail validation');

    // 3. Reject invalid gender
    const invalidGender = AdminUpdateStudentSchema.safeParse({
      studentId: '11111111-1111-1111-1111-111111111111',
      full_name: 'ជា សុភា',
      student_id_number: 'STU-002',
      gender: 'OTHER',
      dob: '2008-01-01',
    });
    assert.equal(invalidGender.success, false, 'Invalid gender must fail validation');

    // 4. Reject invalid DOB format
    const invalidDob = AdminUpdateStudentSchema.safeParse({
      studentId: '11111111-1111-1111-1111-111111111111',
      full_name: 'ជា សុភា',
      student_id_number: 'STU-003',
      gender: 'ស្រី',
      dob: '15/05/2008', // Must be YYYY-MM-DD
    });
    assert.equal(invalidDob.success, false, 'Invalid DOB format must fail validation');

    // 5. Reject invalid studentId UUID
    const invalidUuid = AdminUpdateStudentSchema.safeParse({
      studentId: 'invalid-uuid-string',
      full_name: 'ជា សុភា',
      student_id_number: 'STU-004',
      gender: 'ស្រី',
      dob: '2008-05-15',
    });
    assert.equal(invalidUuid.success, false, 'Invalid studentId UUID must fail validation');
  });

  it('Scenario 2: Server Action updateAdminStudentProfileAction enforces strict admin role guard and audit logging', () => {
    assert.ok(fs.existsSync(actionsPath), 'actions.ts must exist');
    const content = fs.readFileSync(actionsPath, 'utf8');

    // Role check
    assert.ok(
      content.includes("role !== 'admin'"),
      'Must verify caller role === admin and fail closed'
    );
    assert.ok(
      content.includes('Unauthorized: Admin privileges required.'),
      'Must return unauthorized message on non-admin caller'
    );

    // Existing student verification & Duplicate student ID check
    assert.ok(
      content.includes(".from('students')") && content.includes(".eq('student_id_number', cleanIdNumber)"),
      'Must query duplicate student_id_number'
    );
    assert.ok(
      content.includes(".neq('id', validated.studentId)"),
      'Duplicate check must exclude current student record'
    );

    // Canonical students update allowlist
    assert.ok(
      content.includes("dob: validated.dob.trim()"),
      'Must sync dob and date_of_birth for database schema compatibility'
    );
    assert.ok(
      content.includes("from('students')") && content.includes(".update(studentUpdates)") && content.includes(".eq('id', validated.studentId)"),
      'Must execute update directly on canonical students table by id'
    );

    // Active enrollment seating update
    assert.ok(
      content.includes(".from('student_enrollments')") && content.includes(".eq('status', 'active')") || content.includes(".eq('academic_year_id', targetYearId)"),
      'Must update active student enrollment seating info'
    );

    // Audit log insertion
    assert.ok(
      content.includes(".from('audit_logs').insert("),
      'Must insert audit log entry'
    );
    assert.ok(
      content.includes("បានកែសម្រួលព័ត៌មានផ្ទាល់ខ្លួនរបស់សិស្ស"),
      'Must record action in audit_logs'
    );

    // Cache revalidation
    assert.ok(
      content.includes("revalidatePath('/admin/students')"),
      'Must revalidate /admin/students path'
    );
  });

  it('Scenario 3: AdminEditStudentModal provides full editing across tabs with client-side image compression', () => {
    assert.ok(fs.existsSync(modalPath), 'AdminEditStudentModal.tsx must exist');
    const content = fs.readFileSync(modalPath, 'utf8');

    // Tabs
    assert.ok(content.includes("'identity'"), 'Must include identity tab');
    assert.ok(content.includes("'family'"), 'Must include family tab');
    assert.ok(content.includes("'additional'"), 'Must include additional tab');

    // Required fields & inputs
    assert.ok(content.includes('fullName'), 'Must include fullName state/input');
    assert.ok(content.includes('studentIdNumber'), 'Must include studentIdNumber state/input');
    assert.ok(content.includes('englishName'), 'Must include englishName state/input');
    assert.ok(content.includes('dob'), 'Must include dob state/input');
    assert.ok(content.includes('deskNumber'), 'Must include deskNumber state/input');
    assert.ok(content.includes('roomNumber'), 'Must include roomNumber state/input');
    assert.ok(content.includes('idPoor'), 'Must include idPoor select/state');
    assert.ok(content.includes('scholarship'), 'Must include scholarship select/state');
    assert.ok(content.includes('orphan'), 'Must include orphan select/state');

    // Photo presign & WebP compression
    assert.ok(content.includes('/api/s3-presign'), 'Must use /api/s3-presign for presigned S3/R2 upload');
    assert.ok(content.includes('image/webp'), 'Must compress images to WebP format');
    assert.ok(
      content.includes('updateAdminStudentProfileAction'),
      'Must invoke updateAdminStudentProfileAction on submit'
    );
  });

  it('Scenario 4: StudentProfileDrawer integrates deep profile fetching and live modal editing', () => {
    assert.ok(fs.existsSync(drawerPath), 'StudentProfileDrawer.tsx must exist');
    const content = fs.readFileSync(drawerPath, 'utf8');

    // Fetches profile
    assert.ok(
      content.includes(".from('students')"),
      'Drawer must fetch deep data from canonical students table'
    );
    assert.ok(
      content.includes(".from('student_enrollments')"),
      'Drawer must fetch seating data from student_enrollments'
    );

    // Edit button & modal integration
    assert.ok(
      content.includes('setIsEditModalOpen(true)'),
      'Drawer header must have button opening edit modal'
    );
    assert.ok(
      content.includes('<AdminEditStudentModal'),
      'Drawer must render AdminEditStudentModal'
    );
    assert.ok(
      content.includes('onUpdate(updatedStudent)'),
      'Drawer must invoke onUpdate callback upon successful edit'
    );
  });

  it('Scenario 5: MasterStudentsClient handles live onUpdate without losing active table state', () => {
    assert.ok(fs.existsSync(masterClientPath), 'MasterStudentsClient.tsx must exist');
    const content = fs.readFileSync(masterClientPath, 'utf8');

    assert.ok(
      content.includes('onUpdate={(updatedStudent) => {') || content.includes('onUpdate={(updated) => {'),
      'MasterStudentsClient must pass onUpdate prop to StudentProfileDrawer'
    );
    assert.ok(
      content.includes('setStudents((prev) =>'),
      'onUpdate must update student in local students state for zero-flicker table update'
    );
  });
});
