import "./Documents.css";

import {
  Search,
  FileText,
  Download,
  Trash2,
  FolderOpen,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

function Documents() {
  const navigate = useNavigate();

  const {
  session,
  user,
  loading: authLoading,
} = useAuth();

  const [search, setSearch] =
    useState("");

  const [documents, setDocuments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [sortOrder, setSortOrder] =
    useState("newest");


  // =========================================================
  // Load documents for CURRENT USER
  // =========================================================

 const loadDocuments = async () => {
  setLoading(true);
  setError("");

  try {
    if (!session?.access_token) {
      throw new Error("Authentication session not available.");
    }

    const response = await fetch(
      `${API_URL}/api/documents`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const responseText = await response.text();

    console.log(
      "GET /api/documents response:",
      responseText
    );

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        "Backend returned an invalid response."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.detail ||
          data.error ||
          "Unable to load documents."
      );
    }

    const documentList = Array.isArray(data)
      ? data
      : data.documents || [];

    console.log(
      "Documents loaded from database:",
      documentList
    );

    setDocuments(documentList);

  } catch (error) {
    console.error(
      "Failed to load documents:",
      error
    );

    setError(
      error.message ||
        "Unable to load documents."
    );

    setDocuments([]);

  } finally {
    setLoading(false);
  }
};

  // =========================================================
  // Load when authenticated user is available
  // =========================================================

 useEffect(() => {
  if (!authLoading && user?.id && session?.access_token) {
    loadDocuments();
  }
}, [
  user?.id,
  session?.access_token,
  authLoading,
]);


  // =========================================================
  // Delete document
  // =========================================================

  const handleDelete =
    async (documentId) => {

      const confirmed =
        window.confirm(
          "Are you sure you want to delete this document?"
        );

      if (!confirmed) {
        return;
      }

      try {

       const response = await fetch(
        `${API_URL}/api/documents/${documentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

        const responseText =
          await response.text();

        console.log(
          "DELETE document response:",
          responseText
        );

        let data;

        try {
          data =
            JSON.parse(
              responseText
            );
        } catch {
          throw new Error(
            "Backend returned an invalid delete response."
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              data.detail ||
              "Unable to delete document."
          );
        }

        console.log(
          "Document deleted successfully:",
          documentId
        );

        await loadDocuments();

      } catch (error) {

        console.error(
          "Delete document failed:",
          error
        );

        alert(
          error.message ||
            "Unable to delete document."
        );
      }
    };


  // =========================================================
  // Download extracted text
  // =========================================================

  const handleDownload =
    (doc) => {

      const text =
        doc.text || "";

      if (!text.trim()) {

        alert(
          "This document does not contain extracted text."
        );

        return;
      }

      try {

        const blob =
          new Blob(
            [text],
            {
              type:
                "text/plain;charset=utf-8",
            }
          );

        const url =
          window.URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href = url;

        const safeTitle =
          (
            doc.title ||
            "document"
          ).replace(
            /[^a-z0-9]/gi,
            "_"
          );

        link.download =
          `${safeTitle}.txt`;

        document.body.appendChild(
          link
        );

        link.click();

        document.body.removeChild(
          link
        );

        window.URL.revokeObjectURL(
          url
        );

        console.log(
          "Downloaded document:",
          doc.id
        );

      } catch (error) {

        console.error(
          "Download failed:",
          error
        );

        alert(
          "Unable to download document."
        );
      }
    };


  // =========================================================
  // Search + Sort
  // =========================================================

  const filtered =
    documents

      .filter((doc) =>
        (
          doc.title || ""
        )
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
      )

      .sort((a, b) => {

        const dateA =
          new Date(
            a.created_at ||
              a.date ||
              0
          ).getTime();

        const dateB =
          new Date(
            b.created_at ||
              b.date ||
              0
          ).getTime();

        return sortOrder ===
          "newest"
          ? dateB - dateA
          : dateA - dateB;
      });


  // =========================================================
  // Authentication loading
  // =========================================================

  if (authLoading) {
    return (
      <section className="documents-page">

        <div className="documents-empty">

          <p>
            Checking authentication...
          </p>

        </div>

      </section>
    );
  }


  // =========================================================
  // No authenticated user
  // =========================================================

  if (!user) {
    return null;
  }


  // =========================================================
  // UI
  // =========================================================

  return (
    <section className="documents-page">

      {/* =====================================================
          Header
      ===================================================== */}

      <div className="documents-header">

        <div>

          <h1>
            My Documents
          </h1>

          <p>
            View and manage previously
            digitised handwritten
            documents.
          </p>

        </div>

      </div>


      {/* =====================================================
          Search + Sort
      ===================================================== */}

      <div className="documents-toolbar">

        <div className="search-box">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search documents"
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

        </div>


        <select
          value={sortOrder}
          onChange={(e) =>
            setSortOrder(
              e.target.value
            )
          }
        >

          <option value="newest">
            Newest first
          </option>

          <option value="oldest">
            Oldest first
          </option>

        </select>

      </div>


      {/* =====================================================
          Loading
      ===================================================== */}

      {loading && (

        <div className="documents-empty">

          <p>
            Loading documents...
          </p>

        </div>

      )}


      {/* =====================================================
          Error
      ===================================================== */}

      {!loading &&
        error && (

          <div className="documents-empty">

            <p>
              {error}
            </p>

            <button
              onClick={
                loadDocuments
              }
            >
              Try Again
            </button>

          </div>

        )}


      {/* =====================================================
          Empty
      ===================================================== */}

      {!loading &&
        !error &&
        filtered.length === 0 && (

          <div className="documents-empty">

            <FileText size={40} />

            <h3>

              {search
                ? "No matching documents"
                : "No documents yet"}

            </h3>

            <p>

              {search
                ? "Try a different search."
                : "Digitise a handwritten document to see it here."}

            </p>

          </div>

        )}


      {/* =====================================================
          Documents
      ===================================================== */}

      {!loading &&
        !error &&
        filtered.length > 0 && (

          <div className="documents-list">

            {filtered.map(
              (doc) => (

                <div
                  className="document-card"
                  key={doc.id}
                >

                  {/* =================================================
                      Thumbnail
                  ================================================= */}

                  <div className="document-thumb">

                    <FileText
                      size={32}
                    />

                  </div>


                  {/* =================================================
                      Info
                  ================================================= */}

                  <div className="document-info">

                    <h3>
                      {doc.title ||
                        "Untitled Document"}
                    </h3>

                    <p>
                      Digitised handwritten
                      document
                    </p>


                    <div className="document-tags">

                      <span>

                        {doc.created_at
                          ? new Date(
                              doc.created_at
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day:
                                  "2-digit",

                                month:
                                  "short",

                                year:
                                  "numeric",
                              }
                            )
                          : "Unknown date"}

                      </span>


                      <span>
                        {doc.file_type ||
                          doc.type ||
                          "IMAGE"}
                      </span>


                      <span>
                        {doc.status ||
                          "digitised"}
                      </span>

                    </div>

                  </div>


                  {/* =================================================
                      Actions
                  ================================================= */}

                  <div className="document-actions">

                    {/* Open */}

                    <button
                      className="open-btn"
                      onClick={() =>
                        navigate(
                          `/document/${doc.id}`
                        )
                      }
                    >

                      <FolderOpen
                        size={18}
                      />

                      Open

                    </button>


                    {/* Download */}

                    <button
                      onClick={() =>
                        handleDownload(
                          doc
                        )
                      }
                    >

                      <Download
                        size={18}
                      />

                      Download

                    </button>


                    {/* Delete */}

                    <button
                      className="delete-btn"
                      onClick={() =>
                        handleDelete(
                          doc.id
                        )
                      }
                    >

                      <Trash2
                        size={18}
                      />

                      Delete

                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        )}

    </section>
  );
}

export default Documents;