import {
  useParams,
  useNavigate,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import {
  Minus,
  Plus,
  RotateCw,
  Copy,
  Download,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  PlusCircle,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

import "./DocumentViewer.css";


const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://inksense-backend-ifpd.onrender.com";


function DocumentViewer() {

  const { id } = useParams();

  const navigate = useNavigate();


  // =========================================================
  // AUTHENTICATION
  // =========================================================

  const {
    session,
    loading: authLoading,
  } = useAuth();


  // =========================================================
  // Document state
  // =========================================================

  const [document, setDocument] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // =========================================================
  // Multi-page state
  // =========================================================

  const [currentPage, setCurrentPage] =
    useState(1);


  // =========================================================
  // Text state
  // =========================================================

  const [text, setText] =
    useState("");


  // =========================================================
  // Zoom
  // =========================================================

  const [zoom, setZoom] =
    useState(100);


  // =========================================================
  // Load document
  // =========================================================

  useEffect(() => {

    const loadDocument = async () => {

      try {

        setLoading(true);
        setError("");


        console.log(
          `Loading document: ${id}`
        );


        // =====================================================
        // Make sure Supabase authentication is ready
        // =====================================================

        if (!session?.access_token) {

          console.error(
            "No Supabase access token available."
          );

          setError(
            "Authentication session is not available. Please sign in again."
          );

          return;
        }


        console.log(
          "Access token available:",
          true
        );


        // =====================================================
        // Send authenticated request
        // =====================================================

        const response =
          await fetch(
            `${API_URL}/api/documents/${id}`,
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,

                "Content-Type":
                  "application/json",
              },
            }
          );


        const data =
          await response.json();


        console.log(
          "GET SINGLE DOCUMENT:",
          data
        );


        // =====================================================
        // Handle HTTP errors
        // =====================================================

        if (!response.ok) {

          throw new Error(
            data?.detail ||
            data?.error ||
            `Failed to load document. HTTP ${response.status}`
          );

        }


        // =====================================================
        // Handle backend response
        // =====================================================

        if (!data.success) {

          throw new Error(
            data.error ||
            "Failed to load document."
          );

        }


        // =====================================================
        // Get document
        // =====================================================

        const loadedDocument =
          data.document;


        setDocument(
          loadedDocument
        );


        // =====================================================
        // Load pages
        // =====================================================

        const loadedPages =
          Array.isArray(
            loadedDocument.pages
          )
            ? [...loadedDocument.pages].sort(
                (a, b) =>
                  a.page_number -
                  b.page_number
              )
            : [];


        // =====================================================
        // Set initial page
        // =====================================================

        if (
          loadedPages.length > 0
        ) {

          setCurrentPage(
            loadedPages[0].page_number
          );


          setText(
            loadedPages[0].extracted_text ||
            ""
          );

        } else {

          setCurrentPage(1);


          setText(
            loadedDocument.text ||
            ""
          );

        }

      } catch (err) {

        console.error(
          "Document loading error:",
          err
        );


        setError(
          err.message ||
          "Unable to load document."
        );

      } finally {

        setLoading(false);

      }

    };


    // =========================================================
    // IMPORTANT:
    //
    // Wait until AuthContext finishes loading.
    // Then load document only when session exists.
    // =========================================================

    if (
      id &&
      !authLoading
    ) {

      loadDocument();

    }

  }, [
    id,
    session,
    authLoading,
  ]);


  // =========================================================
  // Pages
  // =========================================================

  const pages =
    Array.isArray(document?.pages)
      ? [...document.pages].sort(
          (a, b) =>
            a.page_number -
            b.page_number
        )
      : [];


  const totalPages =
    pages.length;


  const selectedPage =
    pages.find(
      (page) =>
        page.page_number ===
        currentPage
    ) || pages[0];


  // =========================================================
  // Change page
  // =========================================================

  const selectPage = (
    pageNumber
  ) => {

    const page =
      pages.find(
        (item) =>
          item.page_number ===
          pageNumber
      );


    if (!page) {

      return;

    }


    setCurrentPage(
      pageNumber
    );


    setText(
      page.extracted_text ||
      ""
    );


    setZoom(100);

  };


  // =========================================================
  // Previous page
  // =========================================================

  const handlePreviousPage = () => {

    if (
      currentPage <= 1
    ) {

      return;

    }


    selectPage(
      currentPage - 1
    );

  };


  // =========================================================
  // Next page
  // =========================================================

  const handleNextPage = () => {

    if (
      currentPage >=
      totalPages
    ) {

      return;

    }


    selectPage(
      currentPage + 1
    );

  };


  // =========================================================
  // Add page
  // =========================================================

  const handleAddPage = () => {

    if (!document?.id) {

      console.error(
        "Cannot add page: document ID is missing."
      );

      return;

    }


    console.log(
      "Adding page to existing document:",
      document.id
    );


    navigate(
      `/digitise?mode=upload&documentId=${document.id}`
    );

  };


  // =========================================================
  // Authentication loading
  // =========================================================

  if (authLoading) {

    return (

      <main className="viewer-page">

        <div className="viewer-container">

          <div className="document-not-found">

            <h2>
              Checking authentication...
            </h2>

            <p>
              Please wait while your
              authentication session is loaded.
            </p>

          </div>

        </div>

      </main>

    );

  }


  // =========================================================
  // Document loading
  // =========================================================

  if (loading) {

    return (

      <main className="viewer-page">

        <div className="viewer-container">

          <div className="document-not-found">

            <h2>
              Loading document...
            </h2>

            <p>
              Fetching the document
              from the database.
            </p>

          </div>

        </div>

      </main>

    );

  }


  // =========================================================
  // Error
  // =========================================================

  if (error) {

    return (

      <main className="viewer-page">

        <div className="viewer-container">

          <div className="document-not-found">

            <h2>
              Unable to load document
            </h2>

            <p>
              {error}
            </p>


            <button
              className="back-btn"
              onClick={() =>
                navigate("/documents")
              }
            >

              <ArrowLeft size={16} />

              Back to Documents

            </button>

          </div>

        </div>

      </main>

    );

  }


  // =========================================================
  // Document not found
  // =========================================================

  if (!document) {

    return (

      <main className="viewer-page">

        <div className="viewer-container">

          <div className="document-not-found">

            <h2>
              Document Not Found
            </h2>

            <p>
              The requested document
              does not exist.
            </p>


            <button
              className="back-btn"
              onClick={() =>
                navigate("/documents")
              }
            >

              <ArrowLeft size={16} />

              Back

            </button>

          </div>

        </div>

      </main>

    );

  }


  // =========================================================
  // Statistics
  // =========================================================

  const words =
    text.trim() === ""
      ? 0
      : text
          .trim()
          .split(/\s+/)
          .length;


  const characters =
    text.length;


  const lines =
    text.trim() === ""
      ? 0
      : text
          .trim()
          .split(/\n/)
          .length;


  // =========================================================
  // Zoom
  // =========================================================

  const increaseZoom = () => {

    setZoom(
      (previous) =>
        Math.min(
          previous + 10,
          150
        )
    );

  };


  const decreaseZoom = () => {

    setZoom(
      (previous) =>
        Math.max(
          previous - 10,
          50
        )
    );

  };


  const resetZoom = () => {

    setZoom(100);

  };


  // =========================================================
  // Copy current page text
  // =========================================================

  const handleCopyText =
    async () => {

      try {

        await navigator.clipboard.writeText(
          text
        );


        alert(
          "Text copied successfully!"
        );

      } catch (err) {

        console.error(
          "Copy error:",
          err
        );


        alert(
          "Unable to copy text."
        );

      }

    };


  // =========================================================
  // Download complete document
  // =========================================================

  const handleDownloadText =
    () => {

      let completeText =
        "";


      if (
        pages.length > 0
      ) {

        completeText =
          pages
            .map(
              (page) =>
                `Page ${page.page_number}\n\n${
                  page.extracted_text ||
                  ""
                }`
            )
            .join(
              "\n\n--------------------\n\n"
            );

      } else {

        completeText =
          document.text ||
          "";

      }


      const blob =
        new Blob(
          [completeText],
          {
            type:
              "text/plain;charset=utf-8",
          }
        );


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        window.document.createElement(
          "a"
        );


      link.href =
        url;


      const fileName =
        (
          document.title ||
          "InkSense_Document"
        )
          .replace(
            /[<>:"/\\|?*]/g,
            ""
          )
          .replace(
            /\s+/g,
            "_"
          );


      link.download =
        `${fileName}.txt`;


      window.document.body.appendChild(
        link
      );


      link.click();


      window.document.body.removeChild(
        link
      );


      URL.revokeObjectURL(
        url
      );

    };


  // =========================================================
  // Render
  // =========================================================

  return (

    <main className="viewer-page">

      <div className="viewer-container">


        {/* =====================================================
            TOP
        ====================================================== */}

        <div className="viewer-top">

          <button
            className="back-btn"
            onClick={() =>
              navigate("/documents")
            }
          >

            <ArrowLeft size={16} />

            Back

          </button>


          <div className="doc-status">

            <span className="file-type">

              {document.type ||
                document.file_type ||
                "IMAGE"}

            </span>


            <span className="digitised-status">

              {document.status ||
                "digitised"}

            </span>

          </div>

        </div>


        {/* =====================================================
            HEADING
        ====================================================== */}

        <div className="viewer-heading">

          <h1>
            {document.title}
          </h1>


          <p>
            Review the extracted
            handwriting, make
            corrections, then export
            or save your document.
          </p>

        </div>


        {/* =====================================================
            PAGE NAVIGATION
        ====================================================== */}

        <div
          className="page-navigation"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "12px",
            background:
              "rgba(255,255,255,0.7)",
            border:
              "1px solid rgba(0,0,0,0.08)",
          }}
        >

          {/* Previous */}

          <button
            type="button"
            onClick={
              handlePreviousPage
            }
            disabled={
              currentPage <= 1
            }
            aria-label="Previous page"
            title="Previous page"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "42px",
              height: "38px",
              borderRadius: "8px",
              border:
                "1px solid rgba(0,0,0,0.12)",
              cursor:
                currentPage <= 1
                  ? "not-allowed"
                  : "pointer",
              opacity:
                currentPage <= 1
                  ? 0.45
                  : 1,
            }}
          >

            <ChevronLeft
              size={20}
            />

          </button>


          {/* Current page */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              flex: 1,
            }}
          >

            <FileText
              size={18}
            />


            <strong>

              Page {currentPage}
              {" "}
              of{" "}
              {totalPages || 1}

            </strong>

          </div>


          {/* Next */}

          <button
            type="button"
            onClick={
              handleNextPage
            }
            disabled={
              currentPage >=
              totalPages
            }
            aria-label="Next page"
            title="Next page"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "42px",
              height: "38px",
              borderRadius: "8px",
              border:
                "1px solid rgba(0,0,0,0.12)",
              cursor:
                currentPage >=
                totalPages
                  ? "not-allowed"
                  : "pointer",
              opacity:
                currentPage >=
                totalPages
                  ? 0.45
                  : 1,
            }}
          >

            <ChevronRight
              size={20}
            />

          </button>

        </div>


        {/* =====================================================
            ADD PAGE BAR
        ====================================================== */}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "20px",
          }}
        >

          <button
            type="button"
            onClick={
              handleAddPage
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "9px 16px",
              borderRadius: "8px",
              border:
                "1px solid rgba(0,0,0,0.12)",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >

            <PlusCircle
              size={17}
            />

            Add Page

          </button>

        </div>


        {/* =====================================================
            MAIN WORKSPACE
        ====================================================== */}

        <div className="viewer-grid">


          {/* ===================================================
              ORIGINAL DOCUMENT
          =================================================== */}

          <section
            className="viewer-card original-card"
          >

            <div className="card-header">

              <h3>
                Original Document
              </h3>


              <div className="header-icons">

                <button
                  type="button"
                  onClick={
                    decreaseZoom
                  }
                  aria-label="Zoom out"
                  title="Zoom out"
                >

                  <Minus
                    size={16}
                  />

                </button>


                <button
                  type="button"
                  onClick={
                    increaseZoom
                  }
                  aria-label="Zoom in"
                  title="Zoom in"
                >

                  <Plus
                    size={16}
                  />

                </button>


                <button
                  type="button"
                  onClick={
                    resetZoom
                  }
                  aria-label="Reset zoom"
                  title="Reset zoom"
                >

                  <RotateCw
                    size={16}
                  />

                </button>

              </div>

            </div>


            <div className="image-wrapper">

              <div
                className="paper"
                style={{
                  transform:
                    `scale(${zoom / 100})`,
                }}
              >

                {/* =================================================
                    PAGE IMAGE
                ================================================== */}

                {selectedPage?.image_url ? (

                  <img
                    src={
                      selectedPage.image_url
                    }
                    alt={
                      `${document.title} Page ${currentPage}`
                    }
                  />

                ) : selectedPage?.image ? (

                  <img
                    src={
                      selectedPage.image
                    }
                    alt={
                      `${document.title} Page ${currentPage}`
                    }
                  />

                ) : currentPage === 1 &&
                  document.image ? (

                  <img
                    src={
                      document.image
                    }
                    alt={
                      document.title
                    }
                  />

                ) : (

                  <div
                    style={{
                      padding: "40px",
                      textAlign: "center",
                    }}
                  >

                    <p>
                      Unable to load this
                      page image.
                    </p>


                    {selectedPage?.image_path && (

                      <small>
                        {selectedPage.image_path}
                      </small>

                    )}

                  </div>

                )}

              </div>

            </div>


            <div className="image-footer">

              <span>

                Page {currentPage}

                {" • "}

                Zoom {zoom}%

              </span>

            </div>

          </section>


          {/* ===================================================
              EXTRACTED TEXT
          =================================================== */}

          <section
            className="viewer-card extracted-card"
          >

            <div className="card-header">

              <h3>
                Extracted Text
              </h3>


              <label className="checkbox">

                <input
                  type="checkbox"
                />

                <span>
                  Show uncertain words
                </span>

              </label>

            </div>


            <textarea
              className="text-editor"
              value={text}
              onChange={(event) =>
                setText(
                  event.target.value
                )
              }
              placeholder="Extracted text will appear here..."
            />


            {/* =================================================
                Statistics
            ================================================== */}

            <div className="stats">

              <div className="stat-item">

                <strong>
                  {words}
                </strong>

                <span>
                  Words
                </span>

              </div>


              <div className="stat-item">

                <strong>
                  {characters}
                </strong>

                <span>
                  Characters
                </span>

              </div>


              <div className="stat-item">

                <strong>
                  {lines}
                </strong>

                <span>
                  Lines
                </span>

              </div>

            </div>


            <p className="hint">

              You are viewing Page{" "}
              {currentPage}.

            </p>


            {/* =================================================
                Buttons
            ================================================== */}

            <div className="button-group">

              <button
                className="secondary-btn"
                onClick={
                  handleCopyText
                }
                type="button"
              >

                <Copy
                  size={16}
                />

                Copy Text

              </button>


              <button
                className="secondary-btn"
                onClick={
                  handleDownloadText
                }
                type="button"
              >

                <Download
                  size={16}
                />

                Download TXT

              </button>

            </div>


            {/* =================================================
                Add Another Page
            ================================================== */}

            <button
              className="again-btn"
              onClick={
                handleAddPage
              }
              type="button"
            >

              <PlusCircle
                size={17}
              />

              Add Another Page

            </button>

          </section>

        </div>

      </div>

    </main>

  );

}


export default DocumentViewer;