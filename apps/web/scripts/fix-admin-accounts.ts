import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rjnraabxbpvonhowdfuc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbnJhYWJ4YnB2b25ob3dkZnVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5MDg4MiwiZXhwIjoyMDc0OTY2ODgyfQ.sznkahp94LAsnLh7h0HchEZPySMnnnEMcb86cM8YGSM';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAdminAccount(email: string, password: string) {
  console.log(`\n🔧 Fixing admin account: ${email}`);
  
  try {
    // Get the user
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users.find(u => u.email === email);
    
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.id);
    console.log('📧 Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
    
    // Update user to ensure email is confirmed and set password
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: user.user_metadata?.full_name || 'GeoSafety Admin',
          role: 'admin'
        }
      }
    );
    
    if (updateError) {
      console.error('❌ Update error:', updateError.message);
      return;
    }
    
    console.log('✅ User updated successfully');
    console.log('✅ Email confirmed');
    console.log('✅ Password set');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    
    // Test login
    console.log('\n🧪 Testing login...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError) {
      console.error('❌ Login test failed:', signInError.message);
    } else {
      console.log('✅ Login test successful!');
      // Sign out after test
      await supabase.auth.signOut();
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function main() {
  console.log('🔧 Fixing admin accounts...\n');
  
  await fixAdminAccount('admin1@geosafety.ge', 'Admin123!@#');
  await fixAdminAccount('admin2@geosafety.ge', 'Admin456!@#');
  
  console.log('\n✨ Admin accounts fixed!');
  console.log('\n📋 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Account 1:');
  console.log('  Email: admin1@geosafety.ge');
  console.log('  Password: Admin123!@#');
  console.log('\nAccount 2:');
  console.log('  Email: admin2@geosafety.ge');
  console.log('  Password: Admin456!@#');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ You can now login at http://localhost:3000');
}

main();
