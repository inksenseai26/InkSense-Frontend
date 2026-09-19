import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

// =========================================================
// Authorized Admin Emails
// =========================================================
//
// Add the 4 Supabase Authentication email addresses here.
// Use lowercase emails.
//
// Example:
// admin1@gmail.com
// admin2@gmail.com
// =========================================================

const ADMIN_EMAILS = [
  "dineshkarthick2609@gmail.com",
  "hariharanselvam59@gmail.com",
  "kanimozhibabu797@gmail.com",
  "salmanmohammed2227@gmail.com",
];

// =========================================================
// Protected Route
// =========================================================

function ProtectedRoute() {
  const {
    user,
    loading,
    signOut,
  } = useAuth();

  const location = useLocation();

  // =========================================================
  // Authentication still loading
  // =========================================================

  if (loading) {
    return (
      <main
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div>
          Checking authentication...
        </div>
      </main>
    );
  }

  // =========================================================
  // User is NOT logged in
  // =========================================================

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  // =========================================================
  // Check whether logged-in user is an authorized admin
  // =========================================================

  const userEmail =
    user.email?.trim().toLowerCase();

  const isAuthorizedAdmin =
    ADMIN_EMAILS.includes(userEmail);

  // =========================================================
  // Logged in but NOT one of the 4 admins
  // =========================================================

  if (!isAuthorizedAdmin) {
    // Sign the unauthorized user out.
    signOut().catch((error) => {
      console.error(
        "Unauthorized user logout error:",
        error
      );
    });

    return (
      <main
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "30px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            textAlign: "center",
            padding: "40px",
            borderRadius: "16px",
            background: "#ffffff",
            border:
              "1px solid rgba(0,0,0,0.08)",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <h2>
            Access Denied
          </h2>

          <p>
            This account is not authorized
            to access the InkSense AI
            administrator workspace.
          </p>

          <button
            onClick={() =>
              window.location.replace(
                "/login"
              )
            }
            style={{
              marginTop: "15px",
              padding: "10px 18px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  // =========================================================
  // Authorized admin
  // =========================================================

  return <Outlet />;
}

export default ProtectedRoute;