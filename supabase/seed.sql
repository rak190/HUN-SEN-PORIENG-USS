-- MOCK DATA FOR LOCAL DEVELOPMENT ONLY
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
    ('a0000000-0000-0000-0000-000000000010', '២០២៤-២០២៥', '2024-10-01', '2025-07-30', 'closed', false, now()),
    ('a0000000-0000-0000-0000-000000000011', '២០២៥-២០២៦', '2025-10-01', '2026-07-30', 'active', true, now()),
    ('a0000000-0000-0000-0000-000000000012', '២០២៦-២០២៧', '2026-10-01', '2027-07-30', 'planned', false, now());

-- 3. Auth Users & Profiles
-- Using fixed encrypted password 'Password123!'
-- Hash generated via bcrypt: $2a$10$wT0ESt9m4G4QoTqB4G3I7..wT0ESt9m4G4QoTqB4G3I7..wT0ESt9m4

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@hunsenporieng.edu.kh', crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"គ្រូបង្គោល ICT"}', now(), now(), '', '', '', '');

INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000001', 'admin@hunsenporieng.edu.kh')::jsonb, 'email', now(), now(), now());

INSERT INTO public.profiles (id, username, full_name, role, phone, created_at)
VALUES ('a0000000-0000-0000-0000-000000000001', 'admin@hunsenporieng.edu.kh', 'គ្រូបង្គោល ICT', 'admin', '012000001', now());

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'principal@hunsenporieng.edu.kh', crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"ម៉ៅ សុផល"}', now(), now(), '', '', '', '');

INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000002', 'principal@hunsenporieng.edu.kh')::jsonb, 'email', now(), now(), now());

INSERT INTO public.profiles (id, username, full_name, role, phone, created_at)
VALUES ('a0000000-0000-0000-0000-000000000002', 'principal@hunsenporieng.edu.kh', 'ម៉ៅ សុផល', 'principal', '012000002', now());

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'teacher.sok@hunsenporieng.edu.kh', crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"សុខ ពិសិដ្ឋ"}', now(), now(), '', '', '', '');

INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000003', 'teacher.sok@hunsenporieng.edu.kh')::jsonb, 'email', now(), now(), now());

INSERT INTO public.profiles (id, username, full_name, role, phone, created_at)
VALUES ('a0000000-0000-0000-0000-000000000003', 'teacher.sok@hunsenporieng.edu.kh', 'សុខ ពិសិដ្ឋ', 'teacher', '012000003', now());

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'teacher.chan@hunsenporieng.edu.kh', crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"ចាន់ ធីតា"}', now(), now(), '', '', '', '');

INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000004', 'teacher.chan@hunsenporieng.edu.kh')::jsonb, 'email', now(), now(), now());

INSERT INTO public.profiles (id, username, full_name, role, phone, created_at)
VALUES ('a0000000-0000-0000-0000-000000000004', 'teacher.chan@hunsenporieng.edu.kh', 'ចាន់ ធីតា', 'teacher', '012000004', now());

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'teacher.keo@hunsenporieng.edu.kh', crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"កែវ វណ្ណា"}', now(), now(), '', '', '', '');

INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000005', 'teacher.keo@hunsenporieng.edu.kh')::jsonb, 'email', now(), now(), now());

INSERT INTO public.profiles (id, username, full_name, role, phone, created_at)
VALUES ('a0000000-0000-0000-0000-000000000005', 'teacher.keo@hunsenporieng.edu.kh', 'កែវ វណ្ណា', 'teacher', '012000005', now());

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'teacher.heng@hunsenporieng.edu.kh', crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"ហេង សុភាព"}', now(), now(), '', '', '', '');

INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', format('{"sub":"%s","email":"%s"}', 'a0000000-0000-0000-0000-000000000006', 'teacher.heng@hunsenporieng.edu.kh')::jsonb, 'email', now(), now(), now());

INSERT INTO public.profiles (id, username, full_name, role, phone, created_at)
VALUES ('a0000000-0000-0000-0000-000000000006', 'teacher.heng@hunsenporieng.edu.kh', 'ហេង សុភាព', 'teacher', '012000006', now());

-- 4. Classes (Academic Year 2025-2026)
INSERT INTO public.classes (id, name, grade, track, academic_year_id, teacher_id, is_archived, created_at)
VALUES
    ('a0000000-0000-0000-0000-000000000020', '៧ក', 7, 'ទូទៅ', 'a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003', false, now()),
    ('a0000000-0000-0000-0000-000000000021', '៧ខ', 7, 'ទូទៅ', 'a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000004', false, now()),
    ('a0000000-0000-0000-0000-000000000022', '៨ក', 8, 'ទូទៅ', 'a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000005', false, now()),
    ('a0000000-0000-0000-0000-000000000023', '៨ខ', 8, 'ទូទៅ', 'a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000006', false, now());
-- 5. Students & Enrollments

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001000', 'S2025-1001', 'ស៊ុន ពិសី', 'M', '2011-05-21', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001000', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001001', 'S2025-1002', 'ស៊ុន សុភា', 'M', '2011-05-17', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001001', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001002', 'S2025-1003', 'ម៉ៅ ចិន្តា', 'F', '2012-12-04', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001002', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001003', 'S2025-1004', 'ម៉ៅ បញ្ញា', 'M', '2012-07-13', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001003', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001004', 'S2025-1005', 'ប៉ែន ចិន្តា', 'M', '2010-01-03', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001004', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001005', 'S2025-1006', 'លី មករា', 'M', '2012-09-04', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001005', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001006', 'S2025-1007', 'កែវ បញ្ញា', 'F', '2010-12-09', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001006', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001007', 'S2025-1008', 'ជា ស្រីនី', 'M', '2011-04-28', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001007', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001008', 'S2025-1009', 'សុខ ស្រីនី', 'F', '2012-10-03', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001008', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001009', 'S2025-1010', 'ម៉ៅ មករា', 'M', '2011-12-23', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001009', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001010', 'S2025-1011', 'ប៉ែន សុភា', 'F', '2010-05-13', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001010', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001011', 'S2025-1012', 'ជា ពិសី', 'F', '2012-11-23', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001011', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001012', 'S2025-1013', 'សុខ ដារ៉ា', 'M', '2012-04-22', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001012', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001013', 'S2025-1014', 'លី វិរៈ', 'M', '2011-11-22', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001013', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001014', 'S2025-1015', 'លី បញ្ញា', 'M', '2010-11-08', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001014', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001015', 'S2025-1016', 'រស់ បញ្ញា', 'M', '2010-10-24', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001015', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001016', 'S2025-1017', 'ស៊ឹម ស្រីនី', 'M', '2012-12-18', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001016', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001017', 'S2025-1018', 'ចាន់ រស្មី', 'M', '2011-06-19', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001017', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001018', 'S2025-1019', 'ស៊ឹម សុភា', 'F', '2010-03-28', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001018', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001019', 'S2025-1020', 'ម៉ៅ ចិន្តា', 'M', '2010-09-03', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001019', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001020', 'S2025-1021', 'រស់ វិរៈ', 'M', '2011-07-19', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001020', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001021', 'S2025-1022', 'កែវ សុភា', 'M', '2012-02-10', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001021', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001022', 'S2025-1023', 'ម៉ៅ ពិសី', 'M', '2010-05-04', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001022', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001023', 'S2025-1024', 'លី បញ្ញា', 'M', '2011-01-05', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001023', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001024', 'S2025-1025', 'ចាន់ ដារ៉ា', 'F', '2012-09-11', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001024', 'a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001025', 'S2025-1026', 'ស៊ឹម ស្រីនី', 'F', '2010-04-14', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001025', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001026', 'S2025-1027', 'ស៊ុន វិរៈ', 'M', '2012-09-05', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001026', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001027', 'S2025-1028', 'ជា ពិសី', 'F', '2010-07-28', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001027', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001028', 'S2025-1029', 'ប៉ែន រស្មី', 'M', '2011-07-01', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001028', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001029', 'S2025-1030', 'ជា មករា', 'M', '2010-12-23', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001029', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001030', 'S2025-1031', 'លី ចិន្តា', 'F', '2011-04-14', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001030', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001031', 'S2025-1032', 'ស៊ឹម ចិន្តា', 'M', '2012-06-24', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001031', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001032', 'S2025-1033', 'ចាន់ វិរៈ', 'M', '2012-04-03', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001032', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001033', 'S2025-1034', 'លី ចិន្តា', 'M', '2011-12-09', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001033', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001034', 'S2025-1035', 'ជា សុភា', 'M', '2010-12-02', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001034', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001035', 'S2025-1036', 'កែវ វិរៈ', 'F', '2010-10-20', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001035', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001036', 'S2025-1037', 'ម៉ៅ វិរៈ', 'M', '2012-12-22', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001036', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001037', 'S2025-1038', 'ស៊ុន មករា', 'M', '2011-03-11', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001037', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001038', 'S2025-1039', 'ប៉ែន សុភា', 'M', '2011-06-03', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001038', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001039', 'S2025-1040', 'ប៉ែន រស្មី', 'M', '2012-10-08', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001039', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001040', 'S2025-1041', 'សុខ បញ្ញា', 'F', '2011-02-23', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001040', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001041', 'S2025-1042', 'ស៊ឹម វិរៈ', 'M', '2012-08-25', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001041', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001042', 'S2025-1043', 'លី វិបុល', 'M', '2010-09-19', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001042', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001043', 'S2025-1044', 'លី វិបុល', 'F', '2012-10-05', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001043', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001044', 'S2025-1045', 'លី ចិន្តា', 'F', '2011-11-20', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001044', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001045', 'S2025-1046', 'សុខ បញ្ញា', 'F', '2010-10-20', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001045', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001046', 'S2025-1047', 'ម៉ៅ មករា', 'F', '2011-09-19', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001046', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001047', 'S2025-1048', 'ម៉ៅ ដារ៉ា', 'M', '2012-06-25', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001047', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001048', 'S2025-1049', 'ប៉ែន សុភា', 'F', '2010-07-06', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001048', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001049', 'S2025-1050', 'រស់ វិរៈ', 'M', '2012-05-20', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001049', 'a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001050', 'S2025-1051', 'ស៊ុន វិរៈ', 'F', '2011-05-24', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001050', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001051', 'S2025-1052', 'ជា ដារ៉ា', 'F', '2011-05-05', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001051', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001052', 'S2025-1053', 'ជា មករា', 'F', '2012-02-10', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001052', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001053', 'S2025-1054', 'ប៉ែន មករា', 'F', '2011-12-16', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001053', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001054', 'S2025-1055', 'ចាន់ សុភា', 'M', '2012-12-16', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001054', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001055', 'S2025-1056', 'លី ពិសី', 'M', '2012-03-25', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001055', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001056', 'S2025-1057', 'ជា ស្រីនី', 'F', '2010-01-09', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001056', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001057', 'S2025-1058', 'កែវ រស្មី', 'M', '2011-07-03', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001057', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001058', 'S2025-1059', 'ចាន់ រស្មី', 'F', '2010-04-24', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001058', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001059', 'S2025-1060', 'ស៊ុន វិបុល', 'F', '2010-01-23', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001059', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001060', 'S2025-1061', 'ម៉ៅ ដារ៉ា', 'M', '2010-02-06', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001060', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001061', 'S2025-1062', 'ជា ចិន្តា', 'F', '2010-04-24', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001061', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001062', 'S2025-1063', 'កែវ ចិន្តា', 'M', '2010-10-17', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001062', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001063', 'S2025-1064', 'សុខ សុភា', 'M', '2010-09-17', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001063', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001064', 'S2025-1065', 'លី ពិសី', 'F', '2012-07-12', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001064', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001065', 'S2025-1066', 'រស់ សុភា', 'F', '2012-09-07', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001065', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001066', 'S2025-1067', 'ប៉ែន ស្រីនី', 'F', '2010-02-18', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001066', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001067', 'S2025-1068', 'ស៊ឹម ចិន្តា', 'M', '2011-10-10', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001067', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001068', 'S2025-1069', 'កែវ សុភា', 'M', '2011-10-11', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001068', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001069', 'S2025-1070', 'សុខ ដារ៉ា', 'M', '2011-02-16', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001069', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001070', 'S2025-1071', 'ជា វិរៈ', 'F', '2010-08-26', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001070', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001071', 'S2025-1072', 'សុខ ដារ៉ា', 'M', '2011-05-12', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001071', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001072', 'S2025-1073', 'កែវ ចិន្តា', 'M', '2012-11-15', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001072', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001073', 'S2025-1074', 'ម៉ៅ វិរៈ', 'M', '2010-02-14', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001073', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001074', 'S2025-1075', 'ស៊ឹម សុភា', 'M', '2010-01-18', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001074', 'a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001075', 'S2025-1076', 'លី ពិសី', 'F', '2012-09-28', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001075', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001076', 'S2025-1077', 'ស៊ឹម ពិសី', 'M', '2010-05-10', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001076', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001077', 'S2025-1078', 'ជា បញ្ញា', 'M', '2011-02-17', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001077', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001078', 'S2025-1079', 'កែវ រស្មី', 'M', '2012-09-18', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001078', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001079', 'S2025-1080', 'លី បញ្ញា', 'M', '2011-07-14', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001079', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001080', 'S2025-1081', 'ស៊ឹម វិបុល', 'F', '2012-04-27', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001080', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001081', 'S2025-1082', 'ស៊ឹម វិរៈ', 'M', '2010-01-18', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001081', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001082', 'S2025-1083', 'កែវ ស្រីនី', 'F', '2012-10-10', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001082', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001083', 'S2025-1084', 'ម៉ៅ វិបុល', 'M', '2011-08-11', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001083', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001084', 'S2025-1085', 'សុខ ស្រីនី', 'F', '2011-02-06', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001084', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001085', 'S2025-1086', 'ស៊ុន វិបុល', 'F', '2011-05-04', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001085', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001086', 'S2025-1087', 'ជា មករា', 'M', '2012-11-01', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001086', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001087', 'S2025-1088', 'ជា មករា', 'M', '2012-12-03', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001087', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001088', 'S2025-1089', 'ជា វិបុល', 'M', '2010-01-22', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001088', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001089', 'S2025-1090', 'ស៊ឹម វិរៈ', 'F', '2010-06-12', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001089', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001090', 'S2025-1091', 'ស៊ឹម វិបុល', 'M', '2010-09-19', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001090', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001091', 'S2025-1092', 'កែវ ដារ៉ា', 'F', '2012-04-03', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001091', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001092', 'S2025-1093', 'ស៊ឹម រស្មី', 'F', '2011-06-01', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001092', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001093', 'S2025-1094', 'ស៊ឹម ដារ៉ា', 'M', '2010-04-01', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001093', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001094', 'S2025-1095', 'ចាន់ ដារ៉ា', 'F', '2011-04-22', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001094', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001095', 'S2025-1096', 'កែវ ដារ៉ា', 'F', '2011-12-18', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001095', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001096', 'S2025-1097', 'ម៉ៅ ស្រីនី', 'F', '2011-12-05', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001096', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001097', 'S2025-1098', 'កែវ សុភា', 'F', '2012-05-12', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001097', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001098', 'S2025-1099', 'លី រស្មី', 'M', '2012-03-07', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001098', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());

INSERT INTO public.students (id, student_id_number, full_name, gender, dob, created_at)
VALUES ('a0000000-0000-0000-0000-000000001099', 'S2025-1100', 'ស៊ឹម មករា', 'F', '2011-12-18', now());

INSERT INTO public.student_enrollments (id, student_id, class_id, academic_year_id, enrollment_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000001099', 'a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000011', 'active', now(), now());
-- 6. Attendance Sample Data (Past 5 School Days)

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001000', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001001', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001002', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001003', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001004', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001005', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001006', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001007', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001008', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001009', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001010', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001011', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001012', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001013', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001014', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001015', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001016', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001017', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001018', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001019', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001020', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001021', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001022', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001023', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001024', 'a0000000-0000-0000-0000-000000000020', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001000', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001001', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001002', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001003', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001004', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001005', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001006', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001007', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001008', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001009', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001010', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001011', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001012', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001013', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001014', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001015', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001016', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001017', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001018', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001019', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001020', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001021', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001022', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001023', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001024', 'a0000000-0000-0000-0000-000000000020', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001000', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001001', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001002', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001003', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001004', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001005', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001006', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001007', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001008', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001009', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001010', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001011', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001012', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001013', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001014', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001015', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001016', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001017', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001018', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001019', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001020', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001021', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001022', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001023', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001024', 'a0000000-0000-0000-0000-000000000020', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001000', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001001', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001002', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001003', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001004', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001005', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001006', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001007', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001008', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001009', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001010', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001011', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001012', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001013', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001014', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001015', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001016', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001017', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001018', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001019', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001020', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001021', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001022', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001023', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001024', 'a0000000-0000-0000-0000-000000000020', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001000', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001001', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001002', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001003', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001004', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001005', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001006', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001007', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001008', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001009', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001010', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001011', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001012', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001013', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001014', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001015', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001016', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001017', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001018', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001019', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001020', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001021', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001022', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001023', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001024', 'a0000000-0000-0000-0000-000000000020', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001025', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001026', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001027', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001028', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001029', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001030', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001031', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001032', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001033', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001034', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001035', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001036', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'absent', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001037', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001038', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001039', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001040', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001041', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001042', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001043', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001044', 'a0000000-0000-0000-0000-000000000021', '2026-09-25', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001025', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001026', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001027', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001028', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001029', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001030', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001031', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001032', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001033', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001034', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001035', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001036', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001037', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001038', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001039', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001040', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001041', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001042', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001043', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'absent', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001044', 'a0000000-0000-0000-0000-000000000021', '2026-09-24', 'absent', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001025', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001026', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001027', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001028', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001029', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'absent', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001030', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001031', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001032', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001033', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001034', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001035', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001036', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001037', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001038', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001039', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001040', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001041', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001042', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001043', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001044', 'a0000000-0000-0000-0000-000000000021', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001025', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001026', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001027', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001028', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001029', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001030', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001031', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001032', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001033', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001034', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001035', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001036', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001037', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001038', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001039', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001040', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'absent', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001041', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001042', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'absent', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001043', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001044', 'a0000000-0000-0000-0000-000000000021', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001025', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001026', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'absent', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001027', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'absent', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001028', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001029', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001030', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001031', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001032', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001033', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001034', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001035', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001036', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001037', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001038', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001039', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'absent', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001040', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001041', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001042', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001043', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001044', 'a0000000-0000-0000-0000-000000000021', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001075', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001076', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001077', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001078', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001079', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001080', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001081', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001082', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001083', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001084', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001085', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001086', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001087', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001088', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001089', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001090', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001091', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001092', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001093', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001094', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001095', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001096', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001097', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001098', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001099', 'a0000000-0000-0000-0000-000000000023', '2026-09-24', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001075', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001076', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001077', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001078', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001079', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001080', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001081', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001082', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001083', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001084', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001085', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001086', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001087', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001088', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001089', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001090', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001091', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001092', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001093', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001094', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001095', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001096', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001097', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001098', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001099', 'a0000000-0000-0000-0000-000000000023', '2026-09-23', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001075', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001076', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001077', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001078', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001079', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001080', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001081', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001082', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001083', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001084', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001085', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001086', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001087', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001088', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001089', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001090', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001091', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001092', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001093', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001094', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001095', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001096', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001097', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001098', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001099', 'a0000000-0000-0000-0000-000000000023', '2026-09-22', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001075', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001076', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001077', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001078', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001079', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001080', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001081', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001082', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001083', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001084', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001085', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001086', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001087', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001088', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001089', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001090', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001091', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001092', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001093', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001094', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001095', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001096', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001097', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001098', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.attendance_records (student_id, class_id, date, status, recorded_by, academic_year_id)
VALUES ('a0000000-0000-0000-0000-000000001099', 'a0000000-0000-0000-0000-000000000023', '2026-09-21', 'present', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011');

-- 7. Exam Standards & Scores
INSERT INTO public.exam_subject_standards (subject_name, grade_level, stream_type, coefficient, max_score, is_core, academic_year_id)
VALUES
    ('គណិតវិទ្យា', 7, 'ទូទៅ', 2.0, 50.0, true, 'a0000000-0000-0000-0000-000000000011'),
    ('ភាសាខ្មែរ', 7, 'ទូទៅ', 2.0, 50.0, true, 'a0000000-0000-0000-0000-000000000011'),
    ('រូបវិទ្យា', 7, 'ទូទៅ', 1.0, 50.0, false, 'a0000000-0000-0000-0000-000000000011'),
    ('គីមីវិទ្យា', 7, 'ទូទៅ', 1.0, 50.0, false, 'a0000000-0000-0000-0000-000000000011'),
    ('ជីវវិទ្យា', 7, 'ទូទៅ', 1.0, 50.0, false, 'a0000000-0000-0000-0000-000000000011');

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001000', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":33,"khmer":31,"physics":31,"chemistry":40,"biology":37}'::jsonb,
    236,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001001', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":49,"khmer":47,"physics":47,"chemistry":35,"biology":37}'::jsonb,
    311,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001002', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":36,"khmer":32,"physics":33,"chemistry":46,"biology":47}'::jsonb,
    262,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001003', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":32,"khmer":31,"physics":47,"chemistry":31,"biology":47}'::jsonb,
    251,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001004', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":30,"khmer":43,"physics":44,"chemistry":36,"biology":37}'::jsonb,
    263,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001005', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":40,"khmer":38,"physics":49,"chemistry":44,"biology":46}'::jsonb,
    295,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001006', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":38,"khmer":42,"physics":39,"chemistry":37,"biology":48}'::jsonb,
    284,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001007', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":36,"khmer":48,"physics":44,"chemistry":39,"biology":49}'::jsonb,
    300,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001008', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":34,"khmer":32,"physics":33,"chemistry":45,"biology":36}'::jsonb,
    246,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001009', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":34,"khmer":46,"physics":45,"chemistry":38,"biology":49}'::jsonb,
    292,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001010', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":39,"khmer":40,"physics":35,"chemistry":31,"biology":44}'::jsonb,
    268,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001011', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":49,"khmer":36,"physics":35,"chemistry":43,"biology":38}'::jsonb,
    286,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001012', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":37,"khmer":41,"physics":47,"chemistry":47,"biology":43}'::jsonb,
    293,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001013', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":48,"khmer":39,"physics":42,"chemistry":35,"biology":39}'::jsonb,
    290,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001014', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":41,"khmer":47,"physics":33,"chemistry":31,"biology":48}'::jsonb,
    288,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001015', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":47,"khmer":38,"physics":40,"chemistry":49,"biology":36}'::jsonb,
    295,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001016', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":38,"khmer":39,"physics":31,"chemistry":44,"biology":43}'::jsonb,
    272,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001017', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":46,"khmer":34,"physics":45,"chemistry":49,"biology":43}'::jsonb,
    297,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001018', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":35,"khmer":43,"physics":42,"chemistry":42,"biology":34}'::jsonb,
    274,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001019', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":45,"khmer":37,"physics":30,"chemistry":40,"biology":38}'::jsonb,
    272,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001020', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":42,"khmer":39,"physics":34,"chemistry":31,"biology":30}'::jsonb,
    257,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001021', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":42,"khmer":32,"physics":48,"chemistry":48,"biology":49}'::jsonb,
    293,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001022', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":45,"khmer":37,"physics":39,"chemistry":49,"biology":39}'::jsonb,
    291,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001023', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":44,"khmer":46,"physics":47,"chemistry":38,"biology":49}'::jsonb,
    314,
    'published',
    now(),
    now()
);

INSERT INTO public.grades (student_id, class_id, academic_year_id, period, scores, total_score, status, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000001024', 
    'a0000000-0000-0000-0000-000000000020', 
    'a0000000-0000-0000-0000-000000000011', 
    'month_1', 
    '{"math":47,"khmer":32,"physics":33,"chemistry":40,"biology":39}'::jsonb,
    270,
    'published',
    now(),
    now()
);
