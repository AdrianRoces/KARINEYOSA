import { supabase } from '../supabase.js';

/**
 * Supabase Connection Validation Script
 * Run this in browser console to validate setup
 */

export async function validateSupabaseSetup() {
  console.log('🔍 Starting Supabase Setup Validation...\n');

  const results = {
    environment: false,
    database: false,
    tables: false,
    storage: false,
    auth: false
  };

  try {
    // 1. Check Environment
    console.log('1️⃣ Checking Environment Variables...');
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error('❌ Missing Supabase environment variables');
      return results;
    }
    console.log('✅ Environment variables configured');
    console.log(`   URL: ${url}`);
    results.environment = true;

    // 2. Check Database Connection
    console.log('\n2️⃣ Checking Database Connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message);
      return results;
    }
    console.log('✅ Database connection successful');
    results.database = true;

    // 3. Check Required Tables
    console.log('\n3️⃣ Checking Required Tables...');
    const requiredTables = ['products', 'sizes', 'orders', 'customers', 'stock_transactions'];
    let tablesOk = true;

    for (const tableName of requiredTables) {
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      if (error) {
        console.warn(`   ⚠️ ${tableName}: ${error.message}`);
        tablesOk = false;
      } else {
        console.log(`   ✅ ${tableName}`);
      }
    }
    results.tables = tablesOk;

    // 4. Check Storage
    console.log('\n4️⃣ Checking Storage Bucket...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.warn('   ⚠️ Could not list buckets:', bucketsError.message);
    } else {
      const uploadsExists = buckets?.some(b => b.name === 'uploads');
      if (uploadsExists) {
        console.log('   ✅ uploads bucket exists');
        results.storage = true;
      } else {
        console.warn('   ⚠️ uploads bucket not found');
      }
    }

    // 5. Check Auth
    console.log('\n5️⃣ Checking Authentication...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError) {
      console.warn('   ⚠️ Auth check error:', authError.message);
    } else if (session) {
      console.log('   ✅ User authenticated:', session.user?.email);
      results.auth = true;
    } else {
      console.warn('   ⚠️ No active session - user not logged in');
    }

    // 6. Check RLS Policies
    console.log('\n6️⃣ Checking RLS Policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'products' })
      .catch(() => ({ data: null, error: 'RPC not available' }));

    if (policies) {
      console.log(`   ✅ Found ${policies.length} policies on products table`);
    } else {
      console.warn('   ⚠️ Could not verify RLS policies (may still be working)');
    }

  } catch (error) {
    console.error('❌ Validation error:', error);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Environment:  ${results.environment ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Database:     ${results.database ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Tables:       ${results.tables ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Storage:      ${results.storage ? '✅ OK' : '⚠️  WARNING'}`);
  console.log(`Auth:         ${results.auth ? '✅ OK' : '⚠️  WARNING'}`);

  const allOk = Object.values(results).every(v => v);
  console.log('\n' + (allOk ? '✅ All checks passed! Ready to use.' : '⚠️  Some checks failed. See above for details.'));

  return results;
}

/**
 * Test Product Operations
 */
export async function testProductOperations() {
  console.log('\n🧪 Testing Product Operations...\n');

  try {
    // 1. Create test product
    console.log('1️⃣ Creating test product...');
    const { data: productData, error: createError } = await supabase
      .from('products')
      .insert({
        name: 'Test Product ' + new Date().getTime(),
        category: 'Test',
        price: 100,
        actual_cost: 50
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create product:', createError.message);
      return false;
    }
    console.log('✅ Product created:', productData.id);

    // 2. Create size entry
    console.log('2️⃣ Creating size entry...');
    const { data: sizeData, error: sizeError } = await supabase
      .from('sizes')
      .insert({
        product_id: productData.id,
        name: 'default',
        quantity: 10,
        total_quantity: 10,
        remaining_quantity: 10
      })
      .select()
      .single();

    if (sizeError) {
      console.error('❌ Failed to create size:', sizeError.message);
      return false;
    }
    console.log('✅ Size entry created');

    // 3. Fetch with size data
    console.log('3️⃣ Fetching product with stock data...');
    const { data: fullProduct, error: fetchError } = await supabase
      .from('products')
      .select(`
        *,
        sizes!product_id(*)
      `)
      .eq('id', productData.id)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch:', fetchError.message);
      return false;
    }
    console.log('✅ Fetch successful');
    console.log('   Product:', fullProduct.name);
    console.log('   Stock:', fullProduct.sizes?.[0]?.remaining_quantity);

    // 4. Update quantity
    console.log('4️⃣ Testing stock update...');
    const { error: updateError } = await supabase
      .from('sizes')
      .update({ remaining_quantity: 5 })
      .eq('id', sizeData.id);

    if (updateError) {
      console.error('❌ Failed to update:', updateError.message);
      return false;
    }
    console.log('✅ Stock updated to 5');

    // 5. Cleanup
    console.log('5️⃣ Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productData.id);

    if (deleteError) {
      console.warn('⚠️ Could not delete test product (not critical)');
    } else {
      console.log('✅ Test data cleaned up');
    }

    console.log('\n✅ All product operations successful!');
    return true;

  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

/**
 * Usage in browser console:
 * 
 * import { validateSupabaseSetup, testProductOperations } from './path/to/this/file'
 * 
 * await validateSupabaseSetup()
 * await testProductOperations()
 */
