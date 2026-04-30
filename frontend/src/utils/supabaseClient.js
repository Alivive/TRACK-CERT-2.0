// Mock Supabase client - returns null operations gracefully
// This allows the app to run without Supabase while you migrate to your own backend

class MockSupabaseClient {
  constructor() {
    this.auth = {
      signInWithPassword: async () => ({ error: new Error('Auth not configured') }),
      signUp: async () => ({ error: new Error('Auth not configured') }),
      signOut: async () => ({ error: new Error('Auth not configured') }),
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      jwt: () => null
    };
  }

  from(table) {
    return {
      select: () => ({
        eq: () => ({ data: [], error: null }),
        order: () => ({ data: [], error: null })
      }),
      insert: () => ({ data: [], error: null }),
      update: () => ({ data: [], error: null }),
      delete: () => ({ data: [], error: null }),
      upsert: () => ({ data: [], error: null })
    };
  }

  channel(name) {
    return {
      on: () => this.channel(name),
      subscribe: () => {},
      unsubscribe: () => {}
    };
  }

  removeChannel() {}

  rpc(name) {
    return { data: null, error: null };
  }
}

// Use mock client instead of real Supabase
export const supabase = new MockSupabaseClient();

console.warn('[SUPABASE] Using mock client - configure your backend API in .env');
