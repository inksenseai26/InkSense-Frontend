import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Camera, CheckCircle2, RefreshCcw, Smartphone } from "lucide-react";
import "./LiveCameraPhone.css";

const API_URL = import.meta.env.VITE_API_URL;

function getWebSocketUrl(sessionId, code) {
  const apiUrl = new URL(API_URL);
  const protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${apiUrl.host}/ws/live/${sessionId}?role=phone&code=${encodeURIComponent(code)}`;
}

function LiveCameraPhone() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code") || "";

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);

  const [status, setStatus] = useState("Starting phone camera...");
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const createOffer = async () => {
      if (!streamRef.current || !socketRef.current) return;
      if (socketRef.current.readyState !== WebSocket.OPEN) return;

      if (!peerRef.current) {
        const peer = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });

        peerRef.current = peer;

        streamRef.current.getTracks().forEach((track) => {
          peer.addTrack(track, streamRef.current);
        });

        peer.onicecandidate = (event) => {
          if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(
              JSON.stringify({
                type: "ice",
                candidate: event.candidate,
              })
            );
          }
        };
      }

      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);

      socketRef.current.send(
        JSON.stringify({
          type: "offer",
          offer: peerRef.current.localDescription,
        })
      );

      setStatus("Sending phone camera to InkSense...");
    };

    const start = async () => {
      if (!sessionId || !code) {
        setError("This live-camera link is incomplete.");
        return;
      }

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not supported by this browser.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
        setStatus("Camera ready. Connecting to InkSense...");

        const socket = new WebSocket(getWebSocketUrl(sessionId, code));
        socketRef.current = socket;

        socket.onopen = () => {
          setStatus("Connected. Waiting for the InkSense laptop...");
        };

        socket.onmessage = async (event) => {
          const message = JSON.parse(event.data);

          if (message.type === "peer_joined") {
            await createOffer();
          }

          if (message.type === "answer" && peerRef.current) {
            await peerRef.current.setRemoteDescription(message.answer);
            setStatus("Live camera connected to InkSense.");
          }

          if (message.type === "ice" && peerRef.current && message.candidate) {
            try {
              await peerRef.current.addIceCandidate(message.candidate);
            } catch (iceError) {
              console.warn("Phone ICE candidate error:", iceError);
            }
          }

          if (message.type === "peer_left") {
            setStatus("Laptop disconnected. Waiting to reconnect...");
          }
        };

        socket.onerror = () => {
          setError("Unable to connect to the InkSense live session.");
        };

        socket.onclose = () => {
          if (!cancelled) {
            setStatus("Live connection closed.");
          }
        };
      } catch (cameraError) {
        console.error("Phone camera error:", cameraError);
        if (cameraError.name === "NotAllowedError") {
          setError("Camera permission was denied. Allow camera access and reload this page.");
        } else {
          setError(cameraError.message || "Unable to start the phone camera.");
        }
      }
    };

    start();

    return () => {
      cancelled = true;

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [sessionId, code]);

  return (
    <main className="live-phone-page">
      <section className="live-phone-card">
        <div className="live-phone-brand">
          <Smartphone size={22} />
          <span>InkSense AI</span>
        </div>

        <div className="live-phone-icon">
          <Camera size={30} />
        </div>

        <h1>Phone Camera</h1>
        <p className="live-phone-description">
          Keep this page open. Your phone camera is being used as the live camera
          for the InkSense laptop dashboard.
        </p>

        <div className="live-phone-preview">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
          />
          {!cameraReady && (
            <div className="live-phone-preview-overlay">
              <Camera size={28} />
              <span>Starting camera...</span>
            </div>
          )}
        </div>

        <div className="live-phone-status">
          {error ? (
            <span className="live-phone-error">{error}</span>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>{status}</span>
            </>
          )}
        </div>

        <p className="live-phone-code">
          Session: <strong>{code || "------"}</strong>
        </p>

        <button
          type="button"
          className="live-phone-refresh"
          onClick={() => window.location.reload()}
        >
          <RefreshCcw size={17} />
          Restart Camera
        </button>
      </section>
    </main>
  );
}

export default LiveCameraPhone;
