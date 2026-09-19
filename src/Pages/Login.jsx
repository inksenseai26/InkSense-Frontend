import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

import "./Login.css";

function Login() {
  const {
    user,
    loading,
    signIn,
  } = useAuth();

  const location = useLocation();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [isLoggingIn, setIsLoggingIn] =
    useState(false);

  // ---------------------------------------------------------
  // Wait for Supabase session
  // ---------------------------------------------------------

  if (loading) {
    return (
      <main className="login-page">
        <div className="login-loading">
          <h2>Loading...</h2>
          <p>
            Checking your authentication session.
          </p>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // Already logged in
  // ---------------------------------------------------------

  if (user) {
    const from =
      location.state?.from?.pathname ||
      "/";

    return (
      <Navigate
        to={from}
        replace
      />
    );
  }

  // ---------------------------------------------------------
  // Login
  // ---------------------------------------------------------

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );
      return;
    }

    setIsLoggingIn(true);

    try {
      await signIn(
        cleanEmail,
        password
      );
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setError(
        "Invalid email or password."
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <main className="login-page">

      <div className="login-card">

        <div className="login-logo">
          <span>InkSense AI</span>
        </div>

        <div className="login-heading">
          <h1>
            Welcome Back
          </h1>

          <p>
            Sign in to access your
            InkSense workspace.
          </p>
        </div>

        {error && (
          <div className="login-error">

            <AlertCircle size={18} />

            <span>
              {error}
            </span>

          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="login-form"
        >

          <div className="login-field">

            <label htmlFor="email">
              Email Address
            </label>

            <div className="login-input-wrapper">

              <Mail size={18} />

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="Enter your email"
                autoComplete="email"
                disabled={isLoggingIn}
              />

            </div>

          </div>

          <div className="login-field">

            <label htmlFor="password">
              Password
            </label>

            <div className="login-input-wrapper">

              <Lock size={18} />

              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoggingIn}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (previous) =>
                      !previous
                  )
                }
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>

            </div>

          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isLoggingIn}
          >

            <LogIn size={18} />

            {isLoggingIn
              ? "Signing in..."
              : "Sign In"}

          </button>

        </form>

        <p className="login-admin-note">
          Authorized administrators only.
        </p>

      </div>

    </main>
  );
}

export default Login;