import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Create a Supabase client with the service role key to bypass RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const args = process.argv.slice(2);
  if (args.length !== 3) {
    console.log('Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password> <full_name>');
    console.log('Example: node --env-file=.env.local scripts/create-admin.mjs admin@school.edu.kh "SecurePassword123!" "System Administrator"');
    process.exit(1);
  }

  const [email, password, fullName] = args;

  console.log(`\n🚀 Provisioning bootstrap Admin account for: ${email}`);

  // 1. Create the user in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already exists') || authError.status === 422) {
      console.error(`❌ User with email ${email} already exists in auth.`);
      
      // Upgrade existing user
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(u => u.email === email);
      
      if (existingUser) {
        console.log(`⚠️ User found (ID: ${existingUser.id}). Promoting to admin...`);
        await promoteToAdmin(existingUser.id, fullName, email);
      }
      process.exit(0);
    } else {
      console.error('❌ Failed to create auth user:', authError.message);
      process.exit(1);
    }
  }

  const userId = authData.user.id;
  console.log(`✅ Auth user created successfully. ID: ${userId}`);
  
  await promoteToAdmin(userId, fullName, email);
}

async function promoteToAdmin(userId, fullName, email) {
  // Generate a username from email (e.g. "admin@..." -> "admin")
  const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);

  // 2. Insert or Update the user's profile with 'admin' role
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      username: username,
      full_name: fullName,
      role: 'admin',
      is_active: true
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('❌ Failed to create/update admin profile:', profileError.message);
    
    // Attempt rollback of auth user if this was a fresh creation
    console.log('⚠️ Rolling back auth user creation...');
    await supabaseAdmin.auth.admin.deleteUser(userId);
    process.exit(1);
  }

  console.log(`✅ Profile successfully created/updated with 'admin' role.`);
  console.log(`\n🎉 SUCCESS! You can now log in at /login with ${email || 'your email'}`);
}

createAdmin().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
