import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // =========================================================
  // Authentication state
  // =========================================================

  const [session, setSession] =
    useState(null);

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  // =========================================================
  // Initialize Supabase authentication
  // =========================================================

  useEffect(() => {
    let mounted = true;

    // =======================================================
    // Get existing session
    // =======================================================

    const loadSession = async () => {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            "Error getting Supabase session:",
            error
          );

          if (mounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }

          return;
        }

        if (!mounted) {
          return;
        }

        const currentSession =
          data?.session || null;

        setSession(
          currentSession
        );

        setUser(
          currentSession?.user || null
        );

        setLoading(false);

      } catch (error) {
        console.error(
          "Supabase session initialization error:",
          error
        );

        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    loadSession();


    // =======================================================
    // Listen for authentication changes
    // =======================================================

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {

          if (!mounted) {
            return;
          }

          console.log(
            "Supabase auth event:",
            _event
          );

          setSession(
            newSession || null
          );

          setUser(
            newSession?.user || null
          );

          setLoading(false);
        }
      );


    // =======================================================
    // Cleanup
    // =======================================================

    return () => {
      mounted = false;

      listener?.subscription?.unsubscribe();
    };
  }, []);


  // =========================================================
  // Sign In
  // =========================================================

  const signIn = async (
    email,
    password
  ) => {

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      throw new Error(
        "Email address is required."
      );
    }

    if (!password) {
      throw new Error(
        "Password is required."
      );
    }

    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (error) {
      console.error(
        "Supabase sign-in error:",
        error
      );

      throw error;
    }

    console.log(
      "User signed in:",
      data?.user?.email
    );

    return data;
  };


  // =========================================================
  // Sign Out
  // =========================================================

  const signOut = async () => {

    const {
      error,
    } = await supabase.auth.signOut();

    if (error) {
      console.error(
        "Supabase sign-out error:",
        error
      );

      throw error;
    }

    // =======================================================
    // onAuthStateChange will normally update these states.
    // We also clear them here so the UI updates immediately.
    // =======================================================

    setSession(null);
    setUser(null);

    console.log(
      "User signed out successfully."
    );
  };


  // =========================================================
  // Authentication context value
  // =========================================================

  const value = {
    session,
    user,
    loading,

    signIn,
    signOut,
  };


  // =========================================================
  // Provider
  // =========================================================

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}


// =============================================================
// useAuth Hook
// =============================================================

export function useAuth() {

  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}