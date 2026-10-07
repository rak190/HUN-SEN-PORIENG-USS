const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
if (supabaseUrl.includes('supabase.co')) {
  console.error('⛔ FATAL: ATTEMPTED TO RUN LOCAL SEED ON PRODUCTION (supabase.co)! ABORTING IMMEDIATELY.');
  process.exit(1);
}

const SEED_FILE = path.join(__dirname, '../supabase/seed.sql');

// Deterministic UUID generator for our seed
let uuidCounter = 1;
function nextUUID() {
    return 'a0000000-0000-0000-0000-' + String(uuidCounter++).padStart(12, '0');
}

function getUUID(id) {
    return `a0000000-0000-0000-0000-${String(id).padStart(12, '0')}`;
}

const adminId = getUUID(1);
const principalId = getUUID(2);
const teacher1Id = getUUID(3);
const teacher2Id = getUUID(4);
const teacher3Id = getUUID(5);
const teacher4Id = getUUID(6);

const year1Id = getUUID(10);
const year2Id = getUUID(11);
const year3Id = getUUID(12);

const class1Id = getUUID(20);
const class2Id = getUUID(21);
const class3Id = getUUID(22);
const class4Id = getUUID(23);

const stdSchemaId = getUUID(30);

const dateStr = (d) => d.toISOString().split('T')[0];

const today = new Date('2026-09-26'); // fixed for consistency
const pastDays = [1, 2, 3, 4, 5].map(d => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - d);
    // skip weekends roughly
    if (dt.getDay() === 0) dt.setDate(dt.getDate() - 2);
    if (dt.getDay() === 6) dt.setDate(dt.getDate() - 1);
    return dateStr(dt);
});

let sql = `-- MOCK DATA FOR LOCAL DEVELOPMENT ONLY
-- DO NOT RUN IN PRODUCTION

-- 1. School Information
INSERT INTO public.system_settings (key, value)
VALUES 
    ('school_info', '{"name": "វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង", "code": "HSP-001", "province": "ព្រៃវែង", "district": "ពោធិ៍រៀង", "principal_name": "លោកនាយក ម៉ៅ សុផល"}');

-- 2. Academic Years
-- Disable existing active year from migrations before inserting ours
UPDATE public.academic_years SET is_active = false, status = 'planned' WHERE is_active = true;

INSERT INTO public.academic_years (id, name, start_date, end_date, status, is_active, created_at)
VALUES
    ('${year1Id}', '២០២៤-២០២៥', '2024-10-01', '2025-07-30', 'closed', false, now()),
    ('${year2Id}', '២០២៥-២០២៦', '2025-10-01', '2026-07-30', 'active', true, now()),
    ('${year3Id}', '២០២៦-២០២៧', '2026-10-01', '2027-07-30', 'planned', false, now());

-- 3. Auth Users & Profiles
-- Using fixed encrypted password 'Password123!'
-- Hash generated via bcrypt: $2a$10$wT0ESt9m4G4QoTqB4G3I7..wT0ESt9m4G4QoTqB4G3I7..wT0ESt9m4
`;

const users = [
    { id: adminId, email: 'admin@hunsenporieng.edu.kh', role: 'admin', name: 'គ្រូបង្គោល ICT', phone: '012000001' },
    { id: principalId, email: 'principal@hunsenporieng.edu.kh', role: 'principal', name: 'ម៉ៅ សុផល', phone: '012000002' },
    { id: teacher1Id, email: 'teacher.sok@hunsenporieng.edu.kh', role: 'teacher', name: 'សុខ ពិសិដ្ឋ', phone: '012000003' },
    { id: teacher2Id, email: 'teacher.chan@hunsenporieng.edu.kh', role: 'teacher', name: 'ចាន់ ធីតា', phone: '012000004' },
    { id: teacher3Id, email: 'teacher.keo@hunsenporieng.edu.kh', role: 'teacher', name: 'កែវ វណ្ណា', phone: '012000005' },
    { id: teacher4Id, email: 'teacher.heng@hunsenporieng.edu.kh', role: 'teacher', name: 'ហេង សុភាព', phone: '012000006' }
];

for (const u of users) {
    sql += `
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', '${u.id}', 'authenticated', 'authenticated', '${u.email}', crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"${u.name}"}', now(), now(), '', '', '', '');

INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), '${u.id}', '${u.id}', format('{"sub":"%s","email":"%s"}', '${u.id}', '${u.email}')::jsonb, 'email', now(), now(), now());

INSERT INTO public.profiles (id, username, full_name, role, phone, created_at)
VALUES ('${u.id}', '${u.email}', '${u.name}', '${u.role}', '${u.phone}', now());
`;
}

sql += `
-- 4. Classes (Academic Year 2025-2026)
INSERT INTO public.classes (id, name, grade, track, academic_year_id, teacher_id, is_archived, created_at)
VALUES
    ('${class1Id}', '៧ក', 7, 'ទូទៅ', '${year2Id}', '${teacher1Id}', false, now()),
    ('${class2Id}', '៧ខ', 7, 'ទូទៅ', '${year2Id}', '${teacher2Id}', false, now()),
    ('${class3Id}', '៨ក', 8, 'ទូទៅ', '${year2Id}', '${teacher3Id}', false, now()),
    ('${class4Id}', '៨ខ', 8, 'ទូទៅ', '${year2Id}', '${teacher4Id}', false, now());
`;

// 5. Students
const firstNames = ['សុខ', 'ចាន់', 'កែវ', 'លី', 'ម៉ៅ', 'ស៊ឹម', 'រស់', 'ប៉ែន', 'ស៊ុន', 'ជា'];
const lastNames = ['វិបុល', 'ស្រីនី', 'មករា', 'ដារ៉ា', 'ចិន្តា', 'សុភា', 'បញ្ញា', 'ពិសី', 'វិរៈ', 'រស្មី'];
let studentCounter = 1000;

sql += `-- 5. Students & Enrollments\n`;

const studentIdsByClass = {
    [class1Id]: [],
    [class2Id]: [],
    [class3Id]: [],
    [class4Id]: []
};

function generateStudentsForClass(clsId, count) {
    for (let i = 0; i < count; i++) {
        const sId = getUUID(studentCounter++);
        studentIdsByClass[clsId].push(sId);
        
        const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
        const gender = Math.random() > 0.5 ? 'M' : 'F';
        
        const year = 2010 + Math.floor(Math.random() * 3);
        const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
        const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
        const dob = `${year}-${month}-${day}`;
        
        sql += `
INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('${sId}', 'S2025-${studentCounter}', '${fname} ${lname}', '${gender}', '${dob}', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), '${sId}', '${clsId}', '${year2Id}', 'active', now(), now());
`;
    }
}

generateStudentsForClass(class1Id, 25);
generateStudentsForClass(class2Id, 25);
generateStudentsForClass(class3Id, 25);
generateStudentsForClass(class4Id, 25);

sql += `-- 6. Attendance Sample Data (Past 5 School Days)\n`;
// 7A: 100% full attendance
for (const day of pastDays) {
    for (const sId of studentIdsByClass[class1Id]) {
        sql += `
INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('${sId}', '${class1Id}', '${day}', 'present', '${teacher1Id}', '${year2Id}');
`;
    }
}

// 7B: Partial attendance (20/25)
for (const day of pastDays) {
    const partialStudents = studentIdsByClass[class2Id].slice(0, 20);
    for (const sId of partialStudents) {
        const isAbsent = Math.random() > 0.9;
        const status = isAbsent ? 'absent' : 'present';
        sql += `
INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('${sId}', '${class2Id}', '${day}', '${status}', '${teacher2Id}', '${year2Id}');
`;
    }
}
// 8B: 0 attendance today, but maybe past 4 days have attendance
for (let i = 1; i < pastDays.length; i++) {
    const day = pastDays[i];
    for (const sId of studentIdsByClass[class4Id]) {
        sql += `
INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('${sId}', '${class4Id}', '${day}', 'present', '${teacher4Id}', '${year2Id}');
`;
    }
}

sql += `
-- 7. Exam Standards & Scores
INSERT INTO public.exam_subject_standards (subject_name, grade_level, stream_type, coefficient, max_score, is_core, academic_year_id)
VALUES
    ('គណិតវិទ្យា', 7, 'ទូទៅ', 2.0, 50.0, true, '${year2Id}'),
    ('ភាសាខ្មែរ', 7, 'ទូទៅ', 2.0, 50.0, true, '${year2Id}'),
    ('រូបវិទ្យា', 7, 'ទូទៅ', 1.0, 50.0, false, '${year2Id}'),
    ('គីមីវិទ្យា', 7, 'ទូទៅ', 1.0, 50.0, false, '${year2Id}'),
    ('ជីវវិទ្យា', 7, 'ទូទៅ', 1.0, 50.0, false, '${year2Id}');
`;

// Seed Month 1 scores for 7A
for (const sId of studentIdsByClass[class1Id]) {
    const math = Math.floor(Math.random() * 20) + 30; // 30-50
    const khmer = Math.floor(Math.random() * 20) + 30;
    const physics = Math.floor(Math.random() * 20) + 30;
    const chemistry = Math.floor(Math.random() * 20) + 30;
    const biology = Math.floor(Math.random() * 20) + 30;
    
    // total with coeffs: (math+khmer)*2 + (phy+chem+bio) = (50+50)*2 + 150 = 350 max
    const total = (math * 2) + (khmer * 2) + physics + chemistry + biology;
    const avg = parseFloat((total / 7).toFixed(2));
    
    sql += `
INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    '${sId}', 
    '${class1Id}', 
    '${year2Id}', 
    'month_1', 
    '{"math":${math},"khmer":${khmer},"physics":${physics},"chemistry":${chemistry},"biology":${biology}}'::jsonb,
    ${total},
    'published',
    now(),
    now()
);
`;
}

fs.writeFileSync(SEED_FILE, sql);
console.log('Successfully generated seed.sql');
