import { useState } from "react";
import "./Navbar.css";

import {
  PenTool,
  Menu,
  X,
  LogOut,
} from "lucide-react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function Navbar() {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const navigate = useNavigate();

  const { user, signOut } =
    useAuth();

  // =========================================================
  // Logout
  // =========================================================

  const handleLogout = async () => {
    try {
      await signOut();

      setMenuOpen(false);

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      alert(
        "Unable to logout. Please try again."
      );
    }
  };

  return (
    <nav className="navbar">

      <div className="navbar-container">

        {/* =====================================================
            Logo
        ===================================================== */}

        <div
          className="logo"
          onClick={() => {
            navigate("/");
            setMenuOpen(false);
          }}
        >

          <div className="logo-icon">
            <PenTool size={18} />
          </div>

          <h2>
            InkSense AI
          </h2>

        </div>


        {/* =====================================================
            Hamburger
        ===================================================== */}

        <button
          className="menu-btn"
          onClick={() =>
            setMenuOpen(
              (previous) =>
                !previous
            )
          }
          aria-label="Toggle menu"
        >

          {menuOpen ? (
            <X size={26} />
          ) : (
            <Menu size={26} />
          )}

        </button>


        {/* =====================================================
            Navigation
        ===================================================== */}

        <div
          className={`nav-links ${
            menuOpen
              ? "active-menu"
              : ""
          }`}
        >

          <NavLink
            to="/"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            Home
          </NavLink>


          <NavLink
            to="/digitise"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            Digitise
          </NavLink>


          <NavLink
            to="/documents"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            My Documents
          </NavLink>


          <NavLink
            to="/about"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            About
          </NavLink>


          {/* =================================================
              New Scan
          ================================================= */}

          <button
            className="scan-btn"
            onClick={() => {
              navigate(
                "/digitise"
              );

              setMenuOpen(false);
            }}
          >
            New Scan
          </button>


          {/* =================================================
              Logged-in user
          ================================================= */}

          {user && (
            <div className="navbar-user">

              <span
                className="navbar-user-email"
                title={user.email}
              >
                {user.email}
              </span>

            </div>
          )}


          {/* =================================================
              Logout
          ================================================= */}

          <button
            className="logout-btn"
            onClick={
              handleLogout
            }
          >

            <LogOut size={17} />

            <span>
              Logout
            </span>

          </button>

        </div>

      </div>

    </nav>
  );
}

export default Navbar;