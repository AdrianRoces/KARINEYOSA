import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Helper functions for auth
export const auth = {
  signUp: async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    return { session: data?.session ?? null, error }
  },

  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export const profiles = {
  getById: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    return { profile: data, error }
  },

  getOrCreate: async (user) => {
    if (!user?.id) {
      return { profile: null, error: new Error('User is required to load profile.') }
    }

    // 1. Try to fetch existing profile first
    let { profile, error: fetchError } = await profiles.getById(user.id)

    // If found, we are done!
    if (profile) return { profile, error: null }

    // 2. Profile doesn't exist, prepare to create it
    let isFirstAdmin = true
    try {
      const { data: hasAdmin, error: rpcError } = await supabase.rpc('admin_exists');
      if (!rpcError && hasAdmin !== null) {
        isFirstAdmin = !hasAdmin;
      } else {
        const { data: adminCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
        if (adminCheck && adminCheck.length > 0) isFirstAdmin = false;
      }
    } catch (err) {
      console.log('Admin check failed:', err);
    }

    const newStatus = isFirstAdmin ? 'approved' : 'pending';
    const newUsername = user.user_metadata?.username || user.email?.split('@')[0] || `user_${Math.floor(Math.random() * 1000)}`;

    // 3. Attempt to Insert (using insert instead of upsert to avoid RLS update conflicts)
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username: newUsername,
        role: isFirstAdmin ? 'admin' : 'user',
        status: newStatus,
        is_active: true
      })
      .select('*')
      .single()

    if (!insertError && newProfile) {
      return { profile: newProfile, error: null }
    }

    // 4. RACE CONDITION FALLBACK
    // Because App.jsx and Login.jsx listen to auth changes, they run this function 
    // at the EXACT SAME TIME. One will succeed, the other will throw a Constraint Error.
    // If we get an error, let's check one more time if the other process created it!
    let { profile: retryProfile, error: retryError } = await profiles.getById(user.id)
    
    if (retryProfile) {
      // The other process successfully created it! Return it gracefully.
      return { profile: retryProfile, error: null }
    }

    // If it STILL fails, it's a real database error (e.g. they picked a username that is already taken)
    console.error('Final profile creation error:', insertError || retryError);
    return { profile: null, error: insertError || retryError }
  }
}

// Helper functions for storage
export const storage = {
  uploadFile: async (bucket, filePath, file) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)
    return { data, error }
  },

  getPublicUrl: (bucket, filePath) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    return data.publicUrl
  },

  deleteFile: async (bucket, filePath) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath])
    return { data, error }
  }
}

// Helper functions for realtime
export const realtime = {
  subscribeToTable: (table, callback, filter = '*') => {
    return supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table,
        filter: filter
      }, callback)
      .subscribe()
  }
}