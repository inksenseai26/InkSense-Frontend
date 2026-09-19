import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Navbar from "./Pages/Navbar";
import Home from "./Pages/Home";
import Digitise from "./Pages/Digitise";
import Documents from "./Pages/Documents";
import DocumentViewer from "./Pages/DocumentViewer";
import About from "./Pages/About";
import Login from "./Pages/Login";

import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

import "./App.css";

function App() {
  const [message, setMessage] =
    useState("");

  useEffect(() => {
    fetch(
      "https://inksense-backend-ifpd.onrender.com/api/test"
    )
      .then((response) =>
        response.json()
      )
      .then((data) => {
        setMessage(
          data.message
        );
      })
      .catch((error) => {
        console.error(
          "Backend connection error:",
          error
        );
      });
  }, []);

  return (
    <AuthProvider>

      <BrowserRouter>

        <Routes>

          {/* =================================================
              PUBLIC ROUTE
          ================================================= */}

          <Route
            path="/login"
            element={<Login />}
          />

          {/* =================================================
              PROTECTED APPLICATION
          ================================================= */}

          <Route element={<ProtectedRoute />}>

            <Route
              path="/"
              element={
                <>
                  <Navbar />
                  <Home />
                </>
              }
            />

            <Route
              path="/digitise"
              element={
                <>
                  <Navbar />
                  <Digitise />
                </>
              }
            />

            <Route
              path="/documents"
              element={
                <>
                  <Navbar />
                  <Documents />
                </>
              }
            />

            <Route
              path="/document/:id"
              element={
                <>
                  <Navbar />
                  <DocumentViewer />
                </>
              }
            />

            <Route
              path="/about"
              element={
                <>
                  <Navbar />
                  <About />
                </>
              }
            />

          </Route>

        </Routes>

        {/* Temporary Backend Connection Test */}

        <div className="backend-test">
          <p>{message}</p>
        </div>

      </BrowserRouter>

    </AuthProvider>
  );
}

export default App;