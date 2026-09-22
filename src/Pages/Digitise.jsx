import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Digitise.css";
import { useAuth } from "../context/AuthContext";

import {
  Upload,
  Camera,
  Image,
  CameraIcon,
  RefreshCcw,
  X,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

function Digitise() {
  const navigate = useNavigate();
  const {
    user,
    session,
  } = useAuth();

  // =========================================================
  // URL PARAMETERS
  // =========================================================

  const [searchParams] = useSearchParams();

  // If this exists, we are adding a page to an existing document.
  const existingDocumentId =
    searchParams.get("documentId");

  const isAddingPage =
    Boolean(existingDocumentId);

  // =========================================================
  // Active tab
  // =========================================================

  const [activeTab, setActiveTab] = useState(
    searchParams.get("mode") === "camera"
      ? "camera"
      : "upload"
  );

  // =========================================================
  // Upload states
  // =========================================================

  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // =========================================================
  // Camera states
  // =========================================================

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] =
    useState("environment");
  const [cameraCount, setCameraCount] = useState(0);

  const [liveCameraMode, setLiveCameraMode] = useState(false);

  const [liveCapturedImage, setLiveCapturedImage] =
    useState(null);

  const [isLiveCapturing, setIsLiveCapturing] =
    useState(false);

  const [isLiveReviewing, setIsLiveReviewing] =
    useState(false);

  const isLiveReviewingRef = useRef(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // =========================================================
  // PHONE LIVE CAMERA / WEBRTC STATES
  // =========================================================

  const [liveSessionId, setLiveSessionId] = useState(null);
  const [liveJoinCode, setLiveJoinCode] = useState("");
  const [livePhoneUrl, setLivePhoneUrl] = useState("");
  const [liveConnectionStatus, setLiveConnectionStatus] = useState(
    "Preparing phone camera session..."
  );
  const [liveRemoteConnected, setLiveRemoteConnected] = useState(false);

  const liveSocketRef = useRef(null);
  const livePeerRef = useRef(null);
  const livePendingIceRef = useRef([]);
  const liveSessionIdRef = useRef(null);

  // =========================================================
  // FIXED LIVE CAPTURE DETECTION STATES
  // =========================================================

  const [tapCount, setTapCount] = useState(0);

  const [tapDetectionStatus, setTapDetectionStatus] =
    useState("Waiting for pen movement in the capture zone...");

  const tapDetectionFrameRef = useRef(null);

  const previousFrameRef = useRef(null);

  const lastMotionTimeRef = useRef(0);

  const tapCountRef = useRef(0);

  const motionStateRef = useRef("idle");

  const motionStartTimeRef = useRef(0);

  const lastDetectionRunRef = useRef(0);

  // =========================================================
  // Captured image states
  // =========================================================

  const [capturedImage, setCapturedImage] =
    useState(null);

  const [showSaveDialog, setShowSaveDialog] =
    useState(false);

  const [fileName, setFileName] = useState(
    "inkSense-document"
  );

  // =========================================================
  // Gemini / AI states
  // =========================================================

  const [language, setLanguage] =
    useState("English");

  const [isDigitising, setIsDigitising] =
    useState(false);

  const [digitiseError, setDigitiseError] =
    useState("");

  const [extractedText, setExtractedText] =
    useState("");

  // =========================================================
  // Detect mobile device
  // =========================================================

  useEffect(() => {
    const mobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    setIsMobile(mobile);
  }, []);

  // =========================================================
  // Smooth scroll when coming from Home page
  // =========================================================

  useEffect(() => {
    const mode =
      searchParams.get("mode");

    const timer = setTimeout(() => {
      const element = document.getElementById(
        mode === "camera"
          ? "camera-section"
          : "upload-section"
      );

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchParams]);

  // =========================================================
  // Connect camera stream to video element
  // =========================================================

  useEffect(() => {
    if (
      videoRef.current &&
      streamRef.current
    ) {
      videoRef.current.srcObject =
        streamRef.current;
    }
  }, [cameraActive]);

  // =========================================================
  // Cleanup camera when leaving page
  // =========================================================

  useEffect(() => {
    return () => {
      stopCamera();
      stopDoubleTapDetection();
    };
  }, []);

  // =========================================================
  // Normal camera effect
  // =========================================================

  useEffect(() => {
    if (
      activeTab === "camera" &&
      !cameraActive
    ) {
      startCamera();
    }
  }, [activeTab]);

  // =========================================================
  // Phone live camera session effect
  // =========================================================

  useEffect(() => {
    if (activeTab !== "live") {
      return;
    }

    startLiveSession();

    return () => {
      stopDoubleTapDetection();
      stopLiveSession();
    };
  }, [activeTab]);

  // =========================================================
  // Start fixed capture detection
  // =========================================================

  useEffect(() => {
    if (
      activeTab === "live" &&
      liveRemoteConnected
    ) {
      startDoubleTapDetection();
    } else {
      stopDoubleTapDetection();
    }

    return () => {
      stopDoubleTapDetection();
    };
  }, [activeTab, liveRemoteConnected]);

  // =========================================================
  // Open file picker
  // =========================================================

  const handleBrowseClick = () => {
    setUploadError("");

    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // =========================================================
  // Handle selected image
  // =========================================================

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadError("");
    setDigitiseError("");
    setExtractedText("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadError(
        "Please select a JPG, JPEG, or PNG image."
      );

      event.target.value = "";
      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setUploadError(
        "File size exceeds the 10 MB limit. Please choose a smaller image."
      );

      event.target.value = "";
      return;
    }

    const imageUrl =
      URL.createObjectURL(file);

    setSelectedImage({
      file,
      url: imageUrl,
      name: file.name,
    });

    event.target.value = "";
  };

  // =========================================================
  // Remove selected upload
  // =========================================================

  const removeSelectedImage = () => {
    if (selectedImage?.url) {
      URL.revokeObjectURL(
        selectedImage.url
      );
    }

    setSelectedImage(null);
    setUploadError("");
    setDigitiseError("");
    setExtractedText("");
  };

  // =========================================================
  // PHONE LIVE CAMERA / WEBRTC HOST
  // =========================================================

  const getLiveWebSocketUrl = (sessionId, token) => {
    const apiUrl = new URL(API_URL);
    const protocol =
      apiUrl.protocol === "https:" ? "wss:" : "ws:";

    return `${protocol}//${apiUrl.host}/ws/live/${sessionId}?role=host&token=${encodeURIComponent(token)}`;
  };

  const closeLivePeer = () => {
    if (livePeerRef.current) {
      livePeerRef.current.ontrack = null;
      livePeerRef.current.onicecandidate = null;
      livePeerRef.current.close();
      livePeerRef.current = null;
    }

    livePendingIceRef.current = [];
    setLiveRemoteConnected(false);

    if (videoRef.current && activeTab === "live") {
      videoRef.current.srcObject = null;
    }
  };

  const createLiveHostPeer = async () => {
    if (!liveSocketRef.current) {
      return null;
    }

    if (livePeerRef.current) {
      closeLivePeer();
    }

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    livePeerRef.current = peer;

    peer.ontrack = (event) => {
      console.log("🔥🔥🔥 LAPTOP RECEIVED PHONE VIDEO TRACK", event);

      const [remoteStream] = event.streams;

      console.log("🔥 REMOTE STREAM:", remoteStream);

      if (remoteStream) {
        setLiveRemoteConnected(true);

        setTimeout(() => {
          if (videoRef.current) {
            console.log("🔥 ATTACHING REMOTE STREAM TO VIDEO");

            videoRef.current.srcObject = remoteStream;
            videoRef.current.muted = true;
            videoRef.current.play()
              .then(() => {
                console.log("🔥🔥🔥 VIDEO PLAYING SUCCESSFULLY");
              })
              .catch((error) => {
                console.error("❌ VIDEO PLAY ERROR:", error);
              });
          } else {
            console.error("❌ VIDEO ELEMENT STILL NOT FOUND");
          }
        }, 100);
      }

      setLiveRemoteConnected(true);

      setLiveConnectionStatus(
        "Phone camera connected — live stream active."
      );
    };

    peer.onicecandidate = (event) => {
      if (
        event.candidate &&
        liveSocketRef.current?.readyState === WebSocket.OPEN
      ) {
        liveSocketRef.current.send(
          JSON.stringify({
            type: "ice",
            candidate: event.candidate,
          })
        );
      }
    };

    peer.onconnectionstatechange = () => {
      console.log(
        "🔥 WEBRTC CONNECTION STATE:",
        peer.connectionState
      );
      const state = peer.connectionState;

      if (state === "connected") {
        setLiveRemoteConnected(true);
        setLiveConnectionStatus(
          "Phone camera connected — live stream active."
        );
      }

      if (["failed", "disconnected", "closed"].includes(state)) {
        setLiveRemoteConnected(false);
        setLiveConnectionStatus(
          "Phone camera disconnected. Keep the phone page open and reconnect it."
        );
      }
    };

    return peer;
  };

  const handleLiveSignalingMessage = async (message) => {
    if (message.type === "peer_joined") {
      console.log("🔥 LAPTOP RECEIVED PEER_JOINED", message);
      setLiveConnectionStatus(
        "Phone connected. Establishing the live camera stream..."
      );
      return;
    }

    if (message.type === "offer") {
      console.log("🔥 LAPTOP RECEIVED PHONE OFFER", message);
      try {
        const peer = await createLiveHostPeer();

        if (!peer) {
          throw new Error("Live WebRTC peer could not be created.");
        }

        await peer.setRemoteDescription(message.offer);

        for (const candidate of livePendingIceRef.current) {
          try {
            await peer.addIceCandidate(candidate);
          } catch (error) {
            console.warn("Queued ICE candidate error:", error);
          }
        }
        livePendingIceRef.current = [];

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        if (liveSocketRef.current?.readyState === WebSocket.OPEN) {
          liveSocketRef.current.send(
            JSON.stringify({
              type: "answer",
              answer: peer.localDescription,
            })
          );
        }

        setLiveConnectionStatus("Connecting phone camera...");
      } catch (error) {
        console.error("Live WebRTC offer error:", error);
        setLiveConnectionStatus(
          "Unable to establish the phone camera stream."
        );
      }

      return;
    }

    if (message.type === "ice" && message.candidate) {
      if (
        livePeerRef.current &&
        livePeerRef.current.remoteDescription
      ) {
        try {
          await livePeerRef.current.addIceCandidate(
            message.candidate
          );
        } catch (error) {
          console.warn("Live ICE candidate error:", error);
        }
      } else {
        livePendingIceRef.current.push(message.candidate);
      }

      return;
    }

    if (message.type === "peer_left") {
      closeLivePeer();
      setLiveConnectionStatus(
        "Phone disconnected. Open the phone camera link again to reconnect."
      );
    }
  };

  const startLiveSession = async () => {
    if (!session?.access_token) {
      setLiveConnectionStatus(
        "You must be logged in to start Live Camera."
      );
      return;
    }

    setLiveConnectionStatus(
      "Creating secure phone-camera session..."
    );
    setLiveRemoteConnected(false);

    try {
      const response = await fetch(
        `${API_URL}/api/live/session`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          "Backend returned an invalid live-session response."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.detail ||
            "Unable to create the phone-camera session."
        );
      }

      setLiveSessionId(data.session_id);
      liveSessionIdRef.current = data.session_id;
      setLiveJoinCode(data.join_code);
      setLivePhoneUrl(data.phone_url);

      const socket = new WebSocket(
        getLiveWebSocketUrl(
          data.session_id,
          session.access_token
        )
      );

      liveSocketRef.current = socket;

      socket.onopen = () => {
        console.log("🔥 LAPTOP LIVE WEBSOCKET CONNECTED");
        setLiveConnectionStatus(
          "Session ready. Open the phone camera link to connect."
        );
      };



      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          await handleLiveSignalingMessage(message);
        } catch (error) {
          console.error("Live signaling message error:", error);
        }
      };

      socket.onerror = (error) => {
        console.error("🔥 LAPTOP LIVE WEBSOCKET ERROR:", error);
        setLiveConnectionStatus(
          "Unable to connect to the live-camera signaling service."
        );
      };

      socket.onclose = () => {
        setLiveConnectionStatus(
          "Live-camera session disconnected."
        );
      };
    } catch (error) {
      console.error("Live session creation error:", error);
      setLiveConnectionStatus(
        error.message ||
          "Unable to start the phone-camera session."
      );
    }
  };

  const stopLiveSession = async () => {
    closeLivePeer();

    if (liveSocketRef.current) {
      liveSocketRef.current.close();
      liveSocketRef.current = null;
    }

    const sessionIdToClose =
      liveSessionIdRef.current || liveSessionId;

    if (sessionIdToClose && session?.access_token) {
      try {
        await fetch(
          `${API_URL}/api/live/session/${sessionIdToClose}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );
      } catch (error) {
        console.warn(
          "Unable to close live session:",
          error
        );
      }
    }

    setLiveSessionId(null);
    liveSessionIdRef.current = null;
    setLiveJoinCode("");
    setLivePhoneUrl("");
    setLiveRemoteConnected(false);
  };

  // =========================================================
  // Start camera
  // =========================================================

  const startCamera = async (
    facingMode = cameraFacingMode
  ) => {
    setCameraError("");

    try {
      stopCamera();

      if (
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCameraError(
          "Camera access is not supported by this browser."
        );
        return;
      }

      const constraints = {
        video: {
          facingMode: {
            ideal: facingMode,
          },

          width: {
            ideal: 1920,
          },

          height: {
            ideal: 1080,
          },
        },

        audio: false,
      };

      const stream =
        await navigator.mediaDevices.getUserMedia(
          constraints
        );

      streamRef.current = stream;

      setCameraActive(true);

      try {
        const devices =
          await navigator.mediaDevices.enumerateDevices();

        const videoDevices =
          devices.filter(
            (device) =>
              device.kind === "videoinput"
          );

        setCameraCount(
          videoDevices.length
        );
      } catch {
        setCameraCount(0);
      }

      setTimeout(() => {
        if (
          videoRef.current &&
          streamRef.current
        ) {
          videoRef.current.srcObject =
            streamRef.current;
        }
      }, 50);
    } catch (error) {
      console.error(
        "Camera error:",
        error
      );

      if (
        error.name === "NotAllowedError"
      ) {
        setCameraError(
          "Camera permission was denied. Please allow camera access in your browser settings and try again."
        );
      } else if (
        error.name === "NotFoundError"
      ) {
        setCameraError(
          "No camera was detected on this device."
        );
      } else if (
        error.name === "NotReadableError"
      ) {
        setCameraError(
          "The camera is currently being used by another application."
        );
      } else {
        setCameraError(
          "Unable to access the camera. Please check your camera settings and try again."
        );
      }

      setCameraActive(false);
    }
  };

  // =========================================================
  // Stop camera
  // =========================================================

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  // =========================================================
  // Click camera preview
  // =========================================================

  const handleCameraPreviewClick = () => {
    if (!cameraActive) {
      startCamera();
    }
  };

  // =========================================================
  // NORMAL CAMERA CAPTURE
  // =========================================================

  const handleCapture = () => {
    if (
      !videoRef.current ||
      !cameraActive
    ) {
      return;
    }

    const video = videoRef.current;

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setCameraError(
        "Camera is not ready yet. Please wait a moment and try again."
      );

      return;
    }

    const canvas =
      document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context =
      canvas.getContext("2d");

    if (!context) {
      setCameraError(
        "Unable to capture the camera image."
      );

      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const imageData =
      canvas.toDataURL(
        "image/jpeg",
        0.92
      );

    setCapturedImage(imageData);

    setExtractedText("");
    setDigitiseError("");

    stopCamera();

    setFileName(
      "inkSense-document"
    );

    setShowSaveDialog(true);
  };

  // =========================================================
  // FIXED LIVE CAMERA CAPTURE
  // =========================================================

  const handleLiveCapture = () => {
    if (
      !videoRef.current ||
      isLiveReviewingRef.current
    ) {
      return;
    }

    const video = videoRef.current;

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return;
    }

    // Lock immediately
    isLiveReviewingRef.current = true;

    // Stop detection
    stopDoubleTapDetection();

    setIsLiveCapturing(true);

    const canvas =
      document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context =
      canvas.getContext("2d");

    if (!context) {
      setIsLiveCapturing(false);
      isLiveReviewingRef.current = false;
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const imageData =
      canvas.toDataURL(
        "image/jpeg",
        0.92
      );

    setLiveCapturedImage(imageData);

    setExtractedText("");
    setDigitiseError("");

    setTapCount(0);

    tapCountRef.current = 0;

    previousFrameRef.current = null;

    lastMotionTimeRef.current = 0;

    motionStateRef.current = "idle";

    motionStartTimeRef.current = 0;

    setIsLiveCapturing(false);

    setIsLiveReviewing(true);

    setTapDetectionStatus(
      "Image captured — review it before digitising or capturing again."
    );
  };

  // =========================================================
  // Capture Again
  // =========================================================

  const handleLiveCaptureAgain = () => {
    setLiveCapturedImage(null);

    setExtractedText("");

    setDigitiseError("");

    setTapCount(0);

    tapCountRef.current = 0;

    previousFrameRef.current = null;

    lastMotionTimeRef.current = 0;

    motionStateRef.current = "idle";

    motionStartTimeRef.current = 0;

    isLiveReviewingRef.current = false;

    setIsLiveReviewing(false);

    setTapDetectionStatus(
      "Waiting for pen movement in the capture zone..."
    );

    if (
      activeTab === "live" &&
      liveRemoteConnected
    ) {
      startDoubleTapDetection();
    }
  };

  // =========================================================
  // FIXED CAPTURE-ZONE MOTION DETECTION
  //
  // The camera is divided into a fixed processing zone.
  //
  // Only movement inside this zone is considered.
  //
  // Random movements elsewhere are ignored.
  //
  // Two short movement bursts inside the fixed zone
  // trigger the capture.
  // =========================================================

  const detectFrameMotion = (
    video,
    canvas,
    context
  ) => {
    if (
      !video ||
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return {
        motionDetected: false,
        motionStrength: 0,
      };
    }

    // Small processing frame for performance
    const width = 320;
    const height = 180;

    canvas.width = width;
    canvas.height = height;

    context.drawImage(
      video,
      0,
      0,
      width,
      height
    );

    const frame =
      context.getImageData(
        0,
        0,
        width,
        height
      );

    const data = frame.data;

    // =======================================================
    // FIXED CAPTURE ZONE
    //
    // Horizontal:
    // 30% -> 70%
    //
    // Vertical:
    // 55% -> 90%
    //
    // This creates a fixed lower-center region.
    // =======================================================

    const startX = Math.floor(
      width * 0.30
    );

    const endX = Math.floor(
      width * 0.70
    );

    const startY = Math.floor(
      height * 0.55
    );

    const endY = Math.floor(
      height * 0.90
    );

    if (!previousFrameRef.current) {
      previousFrameRef.current =
        new Uint8ClampedArray(data);

      return {
        motionDetected: false,
        motionStrength: 0,
      };
    }

    const previous =
      previousFrameRef.current;

    let changedPixels = 0;

    let totalDifference = 0;

    const sampledPixels =
      Math.ceil(
        (endX - startX) / 3
      ) *
      Math.ceil(
        (endY - startY) / 3
      );

    // =======================================================
    // Compare ONLY fixed capture zone
    // =======================================================

    for (
      let y = startY;
      y < endY;
      y += 3
    ) {
      for (
        let x = startX;
        x < endX;
        x += 3
      ) {
        const index =
          (y * width + x) * 4;

        const currentGray =
          (data[index] +
            data[index + 1] +
            data[index + 2]) /
          3;

        const previousGray =
          (previous[index] +
            previous[index + 1] +
            previous[index + 2]) /
          3;

        const difference =
          Math.abs(
            currentGray -
              previousGray
          );

        // Higher threshold prevents
        // tiny camera noise from triggering.
        if (difference > 25) {
          changedPixels++;

          totalDifference +=
            difference;
        }
      }
    }

    previousFrameRef.current =
      new Uint8ClampedArray(data);

    const changedRatio =
      changedPixels /
      Math.max(
        1,
        sampledPixels
      );

    const averageDifference =
      totalDifference /
      Math.max(
        1,
        changedPixels
      );

    // =======================================================
    // STRICTER MOTION THRESHOLD
    // =======================================================

    const motionDetected =
      changedRatio > 0.08 &&
      averageDifference > 25;

    const motionStrength =
      changedRatio *
      averageDifference;

    return {
      motionDetected,
      motionStrength,
    };
  };

  // =========================================================
  // Register one fixed-zone motion
  // =========================================================

  const registerTapMotion = () => {
    if (
      isLiveReviewingRef.current
    ) {
      return;
    }

    const now = Date.now();

    // Two motions must happen within 1.2 seconds
    const DOUBLE_TAP_WINDOW = 1200;

    // If previous movement was too long ago,
    // start a new sequence.
    if (
      now -
        lastMotionTimeRef.current >
      DOUBLE_TAP_WINDOW
    ) {
      tapCountRef.current = 0;

      setTapCount(0);
    }

    tapCountRef.current += 1;

    const currentTapCount =
      tapCountRef.current;

    lastMotionTimeRef.current =
      now;

    setTapCount(
      currentTapCount
    );

    // =======================================================
    // FIRST MOVEMENT
    // =======================================================

    if (currentTapCount === 1) {
      setTapDetectionStatus(
        "First movement detected — make the second movement in the capture zone..."
      );

      return;
    }

    // =======================================================
    // SECOND MOVEMENT
    // =======================================================

    if (currentTapCount >= 2) {
      setTapDetectionStatus(
        "Fixed double movement detected — capturing..."
      );

      tapCountRef.current = 0;

      setTapCount(0);

      handleLiveCapture();
    }
  };

  // =========================================================
  // Start fixed-zone detection
  // =========================================================

  const startDoubleTapDetection =
    () => {
      stopDoubleTapDetection();

      previousFrameRef.current =
        null;

      tapCountRef.current = 0;

      lastMotionTimeRef.current =
        0;

      motionStateRef.current =
        "idle";

      motionStartTimeRef.current =
        0;

      lastDetectionRunRef.current =
        0;

      setTapCount(0);

      setTapDetectionStatus(
        "Waiting for pen movement in the capture zone..."
      );

      const canvas =
        document.createElement(
          "canvas"
        );

      const context =
        canvas.getContext(
          "2d",
          {
            willReadFrequently: true,
          }
        );

      if (!context) {
        return;
      }

      const runDetection = (
        timestamp
      ) => {
        if (
          activeTab !== "live" ||
          !liveRemoteConnected ||
          !videoRef.current ||
          isLiveReviewingRef.current
        ) {
          return;
        }

        // Around 12 FPS
        if (
          timestamp -
            lastDetectionRunRef.current <
          80
        ) {
          tapDetectionFrameRef.current =
            requestAnimationFrame(
              runDetection
            );

          return;
        }

        lastDetectionRunRef.current =
          timestamp;

        const result =
          detectFrameMotion(
            videoRef.current,
            canvas,
            context
          );

        const now =
          Date.now();

        // ===================================================
        // Motion begins
        // ===================================================

        if (
          result.motionDetected &&
          motionStateRef.current ===
            "idle"
        ) {
          motionStateRef.current =
            "moving";

          motionStartTimeRef.current =
            now;
        }

        // ===================================================
        // Motion ends
        // ===================================================

        if (
          !result.motionDetected &&
          motionStateRef.current ===
            "moving"
        ) {
          const motionDuration =
            now -
            motionStartTimeRef.current;

          motionStateRef.current =
            "idle";

          // Only short movements count.
          if (
            motionDuration >= 70 &&
            motionDuration <= 350
          ) {
            registerTapMotion();
          }
        }

        // ===================================================
        // Safety reset
        // ===================================================

        if (
          motionStateRef.current ===
            "moving" &&
          now -
            motionStartTimeRef.current >
            500
        ) {
          motionStateRef.current =
            "idle";
        }

        // ===================================================
        // Reset old first movement
        // ===================================================

        if (
          tapCountRef.current === 1 &&
          now -
            lastMotionTimeRef.current >
            1200
        ) {
          tapCountRef.current = 0;

          setTapCount(0);

          setTapDetectionStatus(
            "Waiting for pen movement in the capture zone..."
          );
        }

        tapDetectionFrameRef.current =
          requestAnimationFrame(
            runDetection
          );
      };

      tapDetectionFrameRef.current =
        requestAnimationFrame(
          runDetection
        );
    };

  // =========================================================
  // Stop fixed-zone detection
  // =========================================================

  const stopDoubleTapDetection =
    () => {
      if (
        tapDetectionFrameRef.current
      ) {
        cancelAnimationFrame(
          tapDetectionFrameRef.current
        );

        tapDetectionFrameRef.current =
          null;
      }

      previousFrameRef.current =
        null;

      tapCountRef.current = 0;

      motionStateRef.current =
        "idle";
    };

  // =========================================================
  // Switch mobile camera
  // =========================================================

  const handleSwitchCamera =
    async () => {
      setCameraError("");

      if (!isMobile) {
        setCameraError(
          "Camera switching is available on mobile devices only."
        );

        return;
      }

      if (cameraCount === 1) {
        setCameraError(
          "Only one camera is available on this device."
        );

        return;
      }

      const newFacingMode =
        cameraFacingMode ===
        "environment"
          ? "user"
          : "environment";

      setCameraFacingMode(
        newFacingMode
      );

      await startCamera(
        newFacingMode
      );
    };

  // =========================================================
  // Save captured image
  // =========================================================

  const handleSaveCapturedImage =
    () => {
      if (!capturedImage) {
        return;
      }

      let finalFileName =
        fileName.trim();

      if (!finalFileName) {
        finalFileName =
          "inkSense-document";
      }

      finalFileName =
        finalFileName.replace(
          /[<>:"/\\|?*]/g,
          "-"
        );

      if (
        !finalFileName
          .toLowerCase()
          .endsWith(".jpg")
      ) {
        finalFileName += ".jpg";
      }

      const link =
        document.createElement("a");

      link.href = capturedImage;

      link.download =
        finalFileName;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      setShowSaveDialog(false);
    };

  // =========================================================
  // Cancel save dialog
  // =========================================================

  const handleCancelSave = () => {
    setShowSaveDialog(false);
  };

  // =========================================================
  // Change tab
  // =========================================================

  const handleTabChange = (tab) => {
    if (tab === activeTab) {
      return;
    }

    if (
      tab !== "camera" &&
      tab !== "live"
    ) {
      stopDoubleTapDetection();

      stopCamera();

      setLiveCameraMode(false);
    }

    if (tab === "camera") {
      stopDoubleTapDetection();

      setLiveCameraMode(false);
    }

    if (tab === "live") {
      setLiveCameraMode(true);
    }

    setCameraError("");

    setDigitiseError("");

    setExtractedText("");

    setActiveTab(tab);
  };

  // =========================================================
  // DIGITISE WITH GEMINI + SAVE DOCUMENT
  // =========================================================

  const handleDigitise =
    async () => {
      setDigitiseError("");
      setExtractedText("");

      let imageFile = null;

      // =======================================================
      // 1. Get image from Upload
      // =======================================================

      if (
        activeTab === "upload"
      ) {
        if (
          !selectedImage?.file
        ) {
          setDigitiseError(
            "Please select a handwritten image first."
          );

          return;
        }

        imageFile =
          selectedImage.file;
      }

      // =======================================================
      // 2. Get image from Camera
      // =======================================================

      if (
        activeTab === "camera"
      ) {
        if (!capturedImage) {
          setDigitiseError(
            "Please capture a handwritten document first."
          );

          return;
        }

        try {
          imageFile =
            await convertDataUrlToFile(
              capturedImage
            );
        } catch (error) {
          console.error(
            "Camera image conversion failed:",
            error
          );

          setDigitiseError(
            "Unable to prepare the captured image."
          );

          return;
        }
      }

    // =======================================================
    // Live camera
    // =======================================================

    if (activeTab === "live") {
      if (!liveCapturedImage) {
        setDigitiseError(
          "Please capture a handwritten document first."
        );

        return;
      }

      try {
        const response =
          await fetch(
            liveCapturedImage
          );

        const blob =
          await response.blob();

        imageFile = new File(
          [blob],
          "inkSense-live-capture.jpg",
          {
            type: "image/jpeg",
          }
        );
      } catch (error) {
        console.error(
          "Live camera image conversion failed:",
          error
        );

        setDigitiseError(
          "Unable to prepare the live camera image."
        );

        return;
      }
    }

      // =======================================================
      // Safety check
      // =======================================================

      if (!imageFile) {
        setDigitiseError(
          "Unable to prepare the document image."
        );

        return;
      }

      setIsDigitising(true);

      try {
        // =====================================================
        // STEP A — Gemini digitisation
        // =====================================================

        const digitiseFormData =
          new FormData();

        digitiseFormData.append(
          "image",
          imageFile
        );

        digitiseFormData.append(
          "language",
          language
        );

        console.log(
          "Sending image to InkSense Gemini backend..."
        );

        const digitiseResponse =
          await fetch(
            `${API_URL}/api/digitize`,
            {
              method: "POST",
              body:
                digitiseFormData,
            }
          );

        const digitiseResponseText =
          await digitiseResponse.text();

        console.log(
          "InkSense digitisation response:",
          digitiseResponseText
        );

        let digitiseData;

        try {
          digitiseData =
            JSON.parse(
              digitiseResponseText
            );
        } catch (error) {
          console.error(
            "Invalid JSON from digitisation endpoint:",
            digitiseResponseText
          );

          throw new Error(
            "Backend returned an invalid digitisation response."
          );
        }

        if (
          !digitiseResponse.ok ||
          !digitiseData.success
        ) {
          throw new Error(
            digitiseData.error ||
              "Digitisation failed."
          );
        }

        const newExtractedText =
          digitiseData.text
            ?.trim() || "";

        if (
          !newExtractedText
        ) {
          throw new Error(
            "No handwritten text was detected."
          );
        }

        setExtractedText(
          newExtractedText
        );

        // =====================================================
        // STEP B — ADD PAGE TO EXISTING DOCUMENT
        // =====================================================

        if (isAddingPage) {
          console.log(
            "Adding page to existing document:",
            existingDocumentId
          );

          const pageFormData =
            new FormData();

          pageFormData.append(
            "image",
            imageFile
          );

          pageFormData.append(
            "text",
            newExtractedText
          );

          pageFormData.append(
            "language",
            language
          );

         const pageResponse =
          await fetch(
            `${API_URL}/api/documents/${existingDocumentId}/pages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: pageFormData,
            }
          );

          const pageResponseText =
            await pageResponse.text();

          console.log(
            "Add page response:",
            pageResponseText
          );

          let pageData;

          try {
            pageData =
              JSON.parse(
                pageResponseText
              );
          } catch (error) {
            console.error(
              "Invalid JSON from add page endpoint:",
              pageResponseText
            );

            throw new Error(
              "Backend returned an invalid add-page response."
            );
          }

          if (
            !pageResponse.ok ||
            !pageData.success
          ) {
            throw new Error(
              pageData.error ||
                pageData.detail ||
                "Unable to add the page to the existing document."
            );
          }

          console.log(
            "Page added successfully:",
            pageData
          );

          // ===================================================
          // IMPORTANT:
          // Go back to the SAME document.
          // Do NOT create a new document.
          // ===================================================

          navigate(
            `/document/${existingDocumentId}`,
            {
              state: {
                addedPage: true,
                page:
                  pageData.page ||
                  null,
              },
            }
          );

          return;
        }

        // =====================================================
        // STEP C — NORMAL NEW DOCUMENT FLOW
        // =====================================================

        let documentTitle =
          imageFile.name
            ? imageFile.name
                .replace(
                  /\.[^/.]+$/,
                  ""
                )
                .replace(
                  /[_-]/g,
                  " "
                )
            : "Untitled Handwritten Document";

        documentTitle =
          documentTitle.trim() ||
          "Untitled Handwritten Document";

        console.log(
          "Saving new digitised document..."
        );

        const saveFormData =
          new FormData();

        saveFormData.append(
          "image",
          imageFile
        );

        saveFormData.append(
          "text",
          newExtractedText
        );

        saveFormData.append(
          "title",
          documentTitle
        );

        saveFormData.append(
          "language",
          language
        );

        // Use the authenticated user already obtained at the top
        const userId = user?.id;

        if (!userId || !session?.access_token) {
          setDigitiseError(
            "You must be logged in to save a document."
          );
          return;
        }

        saveFormData.append(
          "user_id",
          userId
        );
      const saveResponse =
        await fetch(
          `${API_URL}/api/documents`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: saveFormData,
          }
        );

        const saveResponseText =
          await saveResponse.text();

        console.log(
          "Document save response:",
          saveResponseText
        );

        let saveData;

        try {
          saveData =
            JSON.parse(
              saveResponseText
            );
        } catch (error) {
          console.error(
            "Invalid JSON from document save endpoint:",
            saveResponseText
          );

          throw new Error(
            "Backend returned an invalid document save response."
          );
        }

        if (
          !saveResponse.ok ||
          !saveData.success
        ) {
          throw new Error(
            saveData.error ||
              saveData.detail ||
              "Unable to save the document."
          );
        }

        const savedDocument =
          saveData.document;

        console.log(
          "New document saved successfully:",
          savedDocument
        );

        // =====================================================
        // Navigate to new document
        // =====================================================

        navigate(
          `/document/${savedDocument.id}`,
          {
            state: {
              title:
                savedDocument?.title ||
                documentTitle,

              text:
                savedDocument?.text ||
                newExtractedText,

              imageFile:
                imageFile,

              language:
                savedDocument?.language ||
                language,

              type:
                imageFile.type ||
                "image/jpeg",

              date:
                savedDocument?.date ||
                new Date().toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                ),

              documentId:
                savedDocument?.id ||
                null,

              saved: true,
            },
          }
        );
      } catch (error) {
        console.error(
          "Digitisation / document save error:",
          error
        );

        setDigitiseError(
          error.message ||
            "Unable to process and save the document."
        );
      } finally {
        setIsDigitising(false);
      }
    };

  // =========================================================
  // Render
  // =========================================================

  return (
    <section className="digitise-page">

      {/* =====================================================
          Heading
      ===================================================== */}

      <div className="digitise-header">
        <h1>
          {isAddingPage
            ? "Add Page"
            : "Digitise Handwriting"}
        </h1>

        <p>
          {isAddingPage
            ? "Add another handwritten page to this existing document."
            : "Upload a handwritten document or capture it using your device camera."}
        </p>
      </div>

      {/* =====================================================
          Existing Document Indicator
      ===================================================== */}

      {isAddingPage && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "10px",
            background:
              "#eef4fb",
            border:
              "1px solid #d5e2f0",
            color:
              "#365d85",
            fontSize: "14px",
          }}
        >
          <strong>
            Adding page to existing document
          </strong>

          <div
            style={{
              marginTop: "4px",
              fontSize: "12px",
              opacity: 0.8,
            }}
          >
            Document ID:{" "}
            {existingDocumentId}
          </div>
        </div>
      )}

      {/* =====================================================
          Tabs
      ===================================================== */}

      <div className="digitise-tabs">

        <button
          className={
            activeTab === "upload"
              ? "tab active"
              : "tab"
          }
          onClick={() =>
            handleTabChange("upload")
          }
        >
          Upload Image
        </button>

        <button
          className={
            activeTab === "camera"
              ? "tab active"
              : "tab"
          }
          onClick={() =>
            handleTabChange("camera")
          }
        >
          Take Photo
        </button>

        <button
          className={
            activeTab === "live"
              ? "tab active"
              : "tab"
          }
          onClick={() =>
            handleTabChange("live")
          }
        >
          Live Camera
        </button>

      </div>

      {/* =====================================================
          Upload Section
      ===================================================== */}

      {activeTab === "upload" && (
        <div
          id="upload-section"
          className="upload-wrapper"
        >
          {!selectedImage ? (
            <div className="upload-box">

              <div className="upload-icon">
                <Upload size={28} />
              </div>

              <h2>
                Drag and drop your handwritten
                image here
              </h2>

              <p>
                or browse from your device
              </p>

              <button
                className="browse-btn"
                onClick={
                  handleBrowseClick
                }
              >
                Browse Image
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={
                  handleFileChange
                }
                className="hidden-file-input"
              />

              <span>
                Supported formats: JPG,
                JPEG, PNG • Maximum file
                size: 10 MB
              </span>

              <h4>
                or use a sample document
              </h4>

              {uploadError && (
                <div className="upload-error">
                  <AlertCircle size={17} />

                  <span>
                    {uploadError}
                  </span>
                </div>
              )}

            </div>
          ) : (
            <div className="selected-image-container">

              <div className="selected-image-header">

                <div>
                  <p className="selected-image-label">
                    SELECTED DOCUMENT
                  </p>

                  <h3>
                    {selectedImage.name}
                  </h3>
                </div>

                <button
                  className="remove-image-btn"
                  onClick={
                    removeSelectedImage
                  }
                  title="Remove image"
                >
                  <X size={18} />
                </button>

              </div>

              <div className="selected-image-preview">

                <img
                  src={
                    selectedImage.url
                  }
                  alt="Selected handwritten document"
                />

              </div>

              <div className="selected-image-actions">

                <button
                  className="browse-btn"
                  onClick={
                    handleBrowseClick
                  }
                >
                  Choose Another Image
                </button>

                <p>
                  Image selected
                  successfully. Ready for
                  digitisation.
                </p>

              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={
                  handleFileChange
                }
                className="hidden-file-input"
              />

            </div>
          )}
        </div>
      )}

      {/* =====================================================
          Normal Camera Section
      ===================================================== */}

      {activeTab === "camera" && (
        <div
          id="camera-section"
          className="camera-wrapper"
        >

          <div
            className={
              cameraActive
                ? "camera-preview camera-active"
                : "camera-preview"
            }
            onClick={
              !cameraActive
                ? handleCameraPreviewClick
                : undefined
            }
          >

            {cameraActive ? (
              <video
                ref={videoRef}
                className="camera-video"
                autoPlay
                playsInline
                muted
              />
            ) : capturedImage ? (
              <div className="captured-preview-container">

                <img
                  src={capturedImage}
                  alt="Captured handwritten document"
                  className="captured-preview-image"
                />

                <button
                  className="retake-btn"
                  onClick={() => {
                    setCapturedImage(null);
                    setExtractedText("");
                    setDigitiseError("");
                    startCamera();
                  }}
                >
                  <Camera size={17} />
                  Retake Photo
                </button>

              </div>
            ) : (
              <div className="camera-placeholder">

                <Camera size={30} />

                <h3>
                  Camera preview
                </h3>

                <p>
                  Click here to allow
                  camera access and
                  start the camera.
                </p>

              </div>
            )}

          </div>

          {cameraError && (
            <div className="camera-error">

              <AlertCircle size={18} />

              <span>
                {cameraError}
              </span>

            </div>
          )}

          <div className="camera-buttons">

            <button
              className="capture-btn"
              onClick={
                handleCapture
              }
              disabled={
                !cameraActive
              }
            >
              <CameraIcon size={18} />
              Capture
            </button>

            <button
              className="switch-btn"
              onClick={
                handleSwitchCamera
              }
              disabled={
                !cameraActive
              }
            >
              <RefreshCcw size={18} />
              Switch Camera
            </button>

          </div>

          <p className="camera-tip">
            {cameraActive
              ? "Position your handwritten document clearly inside the camera view."
              : "Place the document on a flat surface with good lighting."}
          </p>

        </div>
      )}

      {/* =====================================================
          LIVE CAMERA SECTION
      ===================================================== */}

      {activeTab === "live" && (
        <div
          id="live-camera-section"
          className="live-camera-wrapper"
        >

          <div className="live-camera-header">

            <div>

              <p className="live-camera-label">
                INKSENSE LIVE CAMERA
              </p>

              <h2>
                Live Handwriting Capture
              </h2>

              <p>
                Keep the camera active while
                writing. Move the pen twice
                inside the fixed capture zone
                to capture the current frame.
              </p>

            </div>

            <div className="live-camera-status">

              <span className="live-status-dot"></span>

              Camera Active

            </div>

          </div>

          {liveSessionId && (
            <div className="live-session-panel">
              <div className="live-session-panel-main">
                <p className="live-session-label">PHONE CAMERA SESSION</p>
                <h3>Connect your phone as the camera</h3>
                <p>
                  Open the link below on your phone. Keep this laptop page open.
                </p>

                <div className="live-session-code">
                  <span>Session Code</span>
                  <strong>{liveJoinCode}</strong>
                </div>

                <div className="live-session-link-row">
                  <input
                    type="text"
                    value={livePhoneUrl}
                    readOnly
                    onFocus={(event) => event.target.select()}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(livePhoneUrl);
                        setLiveConnectionStatus(
                          "Phone camera link copied. Open it on your phone."
                        );
                      } catch {
                        setLiveConnectionStatus(
                          "Copy failed. Select the link manually and open it on your phone."
                        );
                      }
                    }}
                  >
                    Copy Link
                  </button>
                </div>

                <a
                  className="live-session-open-link"
                  href={livePhoneUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Phone Camera Page
                </a>
              </div>
            </div>
          )}

          {/* =================================================
              Live camera preview
          ================================================= */}

          <div className="live-camera-preview">

            {liveRemoteConnected ? (
              <>

                <video
                  ref={videoRef}
                  className="live-camera-video"
                  autoPlay
                  playsInline
                  muted
                />

                {/* ===========================================
                    FIXED CAPTURE ZONE
                =========================================== */}

                {!isLiveReviewing && (
                  <div className="fixed-capture-zone">

                    <div className="fixed-capture-zone-inner">

                      <span>
                        CAPTURE ZONE
                      </span>

                    </div>

                  </div>
                )}

              </>
            ) : (
              <div className="live-camera-placeholder">

                <Camera size={32} />

                <h3>
                  Waiting for phone camera
                </h3>

                <p>
                  Open the phone camera link above to start the live stream.
                </p>

              </div>
            )}

          </div>

          {/* =================================================
              Latest captured image
          ================================================= */}

          {liveCapturedImage && (
            <div className="live-capture-result">

              <div className="live-capture-result-header">

                <div>

                  <p className="live-capture-label">
                    LATEST CAPTURE
                  </p>

                  <h3>
                    Captured Handwriting
                  </h3>

                </div>

                <span className="capture-success-badge">
                  Captured
                </span>

              </div>

              <div className="live-capture-image-wrapper">

                <img
                  src={liveCapturedImage}
                  alt="Latest captured handwriting"
                  className="live-capture-image"
                />

              </div>

              <div className="live-review-actions">

                <button
                  type="button"
                  onClick={
                    handleLiveCaptureAgain
                  }
                  className="secondary-button"
                >
                  <RefreshCcw size={18} />
                  Capture Again
                </button>

                <p className="live-review-message">
                  Automatic capture is paused
                  while you review this image.
                </p>

              </div>

            </div>
          )}

          {/* =================================================
              Camera error
          ================================================= */}

          {cameraError && (
            <div className="camera-error">

              <AlertCircle size={18} />

              <span>
                {cameraError}
              </span>

            </div>
          )}

          {/* =================================================
              Live Camera Controls
          ================================================= */}

          <div className="live-camera-controls">

            <div className="live-camera-info">

              <span className="live-status-dot"></span>

              <span>
                {liveRemoteConnected
                  ? tapDetectionStatus
                  : liveConnectionStatus}
              </span>

            </div>

            <button
              type="button"
              className="live-stop-btn"
              onClick={() => {

                stopDoubleTapDetection();

                stopLiveSession();

                setLiveCameraMode(false);

                setLiveCapturedImage(
                  null
                );

                setTapCount(0);

                setTapDetectionStatus(
                  "Live camera stopped."
                );

              }}
            >
              Stop Live Camera
            </button>

          </div>

          {/* =================================================
              Fixed capture instruction
          ================================================= */}

          <p className="live-camera-tip">

            <strong>
              Pen capture:
            </strong>{" "}
            Once the phone camera is connected, keep
            the pen inside the highlighted capture
            zone and make two quick short movements.
            Movements outside the zone are ignored.

          </p>

        </div>
      )}

      {/* =====================================================
          AI Digitisation Panel
      ===================================================== */}

      {(selectedImage ||
        capturedImage ||
        liveCapturedImage) && (

        <div className="ai-digitise-panel">

          <div className="ai-controls">

            <div className="language-control">

              <label htmlFor="language">
                Document Language
              </label>

              <select
                id="language"
                value={language}
                onChange={(event) =>
                  setLanguage(
                    event.target.value
                  )
                }
              >

                <option value="English">
                  English
                </option>

                <option value="Tamil">
                  Tamil
                </option>

                <option value="English and Tamil">
                  English + Tamil
                </option>

              </select>

            </div>

            <button
              type="button"
              className="digitise-ai-btn"
              onClick={
                handleDigitise
              }
              disabled={
                isDigitising
              }
            >

              <Sparkles size={18} />

              {isDigitising
                ? isAddingPage
                  ? "Adding Page..."
                  : "Digitising..."
                : isAddingPage
                ? "Digitise & Add Page"
                : "Digitise with AI"}

            </button>

          </div>

          {digitiseError && (
            <div className="digitise-error">

              <AlertCircle size={18} />

              <span>
                {digitiseError}
              </span>

            </div>
          )}

        </div>
      )}

      {/* =====================================================
          Save Captured Image Dialog
      ===================================================== */}

      {showSaveDialog && (
        <div className="save-dialog-overlay">

          <div className="save-dialog">

            <button
              className="save-dialog-close"
              onClick={
                handleCancelSave
              }
            >
              <X size={18} />
            </button>

            <div className="save-dialog-icon">
              <Image size={24} />
            </div>

            <h2>
              Save Captured Image
            </h2>

            <p>
              Give your captured document
              a name before saving it.
            </p>

            <label htmlFor="file-name">
              File name
            </label>

            <input
              id="file-name"
              type="text"
              value={fileName}
              onChange={(event) =>
                setFileName(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  handleSaveCapturedImage();
                }
              }}
              autoFocus
              placeholder="Enter file name"
            />

            <span className="file-extension">
              .jpg
            </span>

            <div className="save-dialog-buttons">

              <button
                className="cancel-save-btn"
                onClick={
                  handleCancelSave
                }
              >
                Cancel
              </button>

              <button
                className="confirm-save-btn"
                onClick={
                  handleSaveCapturedImage
                }
              >
                <Check size={17} />
                Save Image
              </button>

            </div>

          </div>

        </div>
      )}

    </section>
  );
}

export default Digitise;