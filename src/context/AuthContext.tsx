import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from 'react';

import {
  supabase,
  hasSupabaseConfig
} from '../lib/supabase';

import {
  Session,
  User
} from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

export const AuthProvider:
React.FC<{
  children: React.ReactNode
}> = ({ children }) => {

  const [session,setSession] =
    useState<Session | null>(null);

  const [user,setUser] =
    useState<User | null>(null);

  const [loading,setLoading] =
    useState(true);

  useEffect(() => {

    async function init() {

      try {

        console.log(
          "AUTH START"
        );

        if (
          !hasSupabaseConfig ||
          !supabase
        ) {

          console.log(
            "NO CONFIG"
          );

          setLoading(false);

          return;
        }

        console.log(
          "GET SESSION"
        );

        const result =
          await supabase
            .auth
            .getSession();

        console.log(
          "SESSION RESULT:",
          result
        );

        setSession(
          result.data.session
        );

        setUser(
          result.data
            .session
            ?.user || null
        );

      } catch(e) {

        console.error(
          "AUTH ERROR:",
          e
        );

      }

      setLoading(false);

    }

    init();

    const {
      data:{
        subscription
      }
    } =
      supabase!.auth
      .onAuthStateChange(
        (
          _event,
          session
        ) => {

          console.log(
            "AUTH CHANGE:",
            _event
          );

          setSession(session);

          setUser(
            session?.user
            || null
          );
      });

    return () =>
      subscription.unsubscribe();

  }, []);

  const signOut =
    async () => {

    if (
      hasSupabaseConfig &&
      supabase
    ) {

      await supabase
        .auth
        .signOut();

    }

  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );

};

export const useAuth = () => {

  const context =
    useContext(
      AuthContext
    );

  if (
    context === undefined
  ) {

    throw new Error(
      'useAuth debe ser usado dentro de AuthProvider'
    );

  }

  return context;

};