import React, { createContext, useContext } from 'react';
import { AuthClient } from '@supabase/auth-js';

const AuthContext = createContext(null);

const supabaseURL = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnon = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseURL || !supabaseAnon) {
  throw new Error('Missing environment variables for Supabase');
}

// Initialize the auth client once
const auth = new AuthClient({
  url: `${supabaseURL}/auth/v1`,
  headers: {
    accept: 'json',
    apikey: supabaseAnon,
  },
});

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider value={{ auth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
