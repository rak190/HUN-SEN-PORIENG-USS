-- Seed script to initialize default admin user
-- Username: admin
-- Password: adminpassword123

DO $$
DECLARE
    new_user_id UUID := 'a0000000-0000-0000-0000-000000000000';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@kruai.com' OR id = new_user_id) THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_user_id,
            'authenticated',
            'authenticated',
            'admin@kruai.com',
            crypt('adminpassword123', gen_salt('bf')),
            current_timestamp,
            '{"provider":"email","providers":["email"]}',
            '{}',
            current_timestamp,
            current_timestamp
        );

        INSERT INTO public.profiles (id, username, full_name, role)
        VALUES (new_user_id, 'admin', 'System Admin', 'admin');
    END IF;
END $$;
