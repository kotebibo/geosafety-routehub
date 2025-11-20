import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rjnraabxbpvonhowdfuc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbnJhYWJ4YnB2b25ob3dkZnVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5MDg4MiwiZXhwIjoyMDc0OTY2ODgyfQ.sznkahp94LAsnLh7h0HchEZPySMnnnEMcb86cM8YGSM';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminAccount(email: string, password: string, fullName: string) {
  console.log(`\n🔐 Creating admin account for: ${email}`);
  
  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users.find(u => u.email === email);
    
    let userId: string;
    
    if (userExists) {
      console.log('ℹ️  User already exists, using existing account');
      userId = userExists.id;
    } else {
      // Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'admin'
        }
      });

      if (authError) {
        console.error('❌ Auth error:', authError.message);
        return;
      }

      console.log('✅ Auth user created:', authData.user.id);
      userId = authData.user.id;
    }

    // Check if role already exists
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingRole) {
      console.log('ℹ️  User role already exists');
      if (existingRole.role !== 'admin') {
        // Update to admin
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ role: 'admin', updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        
        if (updateError) {
          console.error('❌ Role update error:', updateError.message);
        } else {
          console.log('✅ Role updated to admin');
        }
      }
    } else {
      // Insert into user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (roleError) {
        console.error('❌ Role error:', roleError.message);
        return;
      }

      console.log('✅ Admin role assigned successfully');
    }

    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Name: ${fullName}`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function main() {
  console.log('🚀 Creating 2 admin accounts for GeoSafety RouteHub...\n');
  
  // Admin Account 1
  await createAdminAccount(
    'admin1@geosafety.ge',
    'Admin123!@#',
    'GeoSafety Admin 1'
  );
  
  // Admin Account 2
  await createAdminAccount(
    'admin2@geosafety.ge',
    'Admin456!@#',
    'GeoSafety Admin 2'
  );
  
  console.log('\n✨ Admin account creation complete!');
  console.log('\n📋 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Account 1:');
  console.log('  Email: admin1@geosafety.ge');
  console.log('  Password: Admin123!@#');
  console.log('\nAccount 2:');
  console.log('  Email: admin2@geosafety.ge');
  console.log('  Password: Admin456!@#');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main();
