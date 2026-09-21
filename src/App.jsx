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
import LiveCameraPhone from "./Pages/LiveCameraPhone";

import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

import "./App.css";

function App() {
  const [message, setMessage] =
    useState("");

  useEffect(() => {
    fetch(
      "http://127.0.0.1:8000/api/test"
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

          {/* Phone camera does not require the laptop session UI.
              The temporary session code protects access to the stream. */}
          <Route
            path="/live-camera-phone/:sessionId"
            element={<LiveCameraPhone />}
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