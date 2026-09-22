import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  RefreshCcw,
  Smartphone,
} from "lucide-react";
import "./LiveCameraPhone.css";

const API_URL = import.meta.env.VITE_API_URL;

function getWebSocketUrl(sessionId, code) {
  const apiUrl = new URL(API_URL);
  const protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";

  return `${protocol}//${apiUrl.host}/ws/live/${sessionId}?role=phone&code=${encodeURIComponent(
    code
  )}`;
}

function LiveCameraPhone() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code") || "";

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);

  // Prevent duplicate initialization.
  const startedRef = useRef(false);
  const mountedRef = useRef(false);

  const [status, setStatus] = useState("Starting phone camera...");
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    // -------------------------------------------------------
    // Prevent duplicate initialization
    // -------------------------------------------------------
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    mountedRef.current = true;

    let cancelled = false;

    const cleanup = () => {
      cancelled = true;
      mountedRef.current = false;

      // Close WebSocket
      if (socketRef.current) {
        try {
          socketRef.current.onopen = null;
          socketRef.current.onmessage = null;
          socketRef.current.onerror = null;
          socketRef.current.onclose = null;
          socketRef.current.close();
        } catch (error) {
          console.warn("Socket cleanup error:", error);
        }

        socketRef.current = null;
      }

      // Close WebRTC peer
      if (peerRef.current) {
        try {
          peerRef.current.onicecandidate = null;
          peerRef.current.onconnectionstatechange = null;
          peerRef.current.close();
        } catch (error) {
          console.warn("Peer cleanup error:", error);
        }

        peerRef.current = null;
      }

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });

        streamRef.current = null;
      }
    };

    const createOffer = async () => {
      if (cancelled || !mountedRef.current) return;

      const socket = socketRef.current;
      const stream = streamRef.current;

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("Cannot create offer: WebSocket is not open.");
        return;
      }

      if (!stream) {
        console.warn("Cannot create offer: camera stream is missing.");
        return;
      }

      // -------------------------------------------------------
      // Create WebRTC peer only once
      // -------------------------------------------------------
      if (!peerRef.current) {
        const peer = new RTCPeerConnection({
          iceServers: [
            {
              urls: "stun:stun.l.google.com:19302",
            },
            {
              urls: "stun:stun1.l.google.com:19302",
            },
          ],
        });

        peerRef.current = peer;

        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });

        peer.onicecandidate = (event) => {
          if (
            event.candidate &&
            socketRef.current &&
            socketRef.current.readyState === WebSocket.OPEN
          ) {
            socketRef.current.send(
              JSON.stringify({
                type: "ice",
                candidate: event.candidate,
              })
            );
          }
        };

        peer.onconnectionstatechange = () => {
          const connectionState = peer.connectionState;

          console.log(
            "Phone WebRTC connection state:",
            connectionState
          );

          if (connectionState === "connected") {
            setStatus("Live camera connected to InkSense.");
          }

          if (
            connectionState === "failed" ||
            connectionState === "disconnected"
          ) {
            setStatus(
              "WebRTC connection interrupted. Keep this page open."
            );
          }
        };
      }

      try {
        const offer = await peerRef.current.createOffer();

        await peerRef.current.setLocalDescription(offer);

        if (
          socketRef.current &&
          socketRef.current.readyState === WebSocket.OPEN
        ) {
          socketRef.current.send(
            JSON.stringify({
              type: "offer",
              offer: peerRef.current.localDescription,
            })
          );

          setStatus("Sending phone camera to InkSense...");
        }
      } catch (offerError) {
        console.error(
          "Phone WebRTC offer error:",
          offerError
        );
      }
    };

    const start = async () => {
      if (!sessionId || !code) {
        setError("This live-camera link is incomplete.");
        return;
      }

      try {
        // -----------------------------------------------------
        // CAMERA
        // -----------------------------------------------------
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access is not supported by this browser."
          );
        }

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: {
                ideal: "environment",
              },
              width: {
                ideal: 1920,
              },
              height: {
                ideal: 1080,
              },
            },
            audio: false,
          });

        if (cancelled || !mountedRef.current) {
          stream.getTracks().forEach((track) =>
            track.stop()
          );
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setCameraReady(true);
        setStatus(
          "Camera ready. Connecting to InkSense..."
        );

        // -----------------------------------------------------
        // WEBSOCKET
        // -----------------------------------------------------
        const websocketUrl = getWebSocketUrl(
          sessionId,
          code
        );

        console.log(
          "InkSense phone WebSocket:",
          websocketUrl
        );

        const socket = new WebSocket(
          websocketUrl
        );

        socketRef.current = socket;

        socket.onopen = () => {
          if (cancelled) return;

          console.log(
            "InkSense phone WebSocket connected."
          );

          setStatus(
            "Connected. Waiting for the InkSense laptop..."
          );
        };

        socket.onmessage = async (event) => {
          if (cancelled) return;

          try {
            const message = JSON.parse(
              event.data
            );

            console.log(
              "Phone signaling message:",
              message.type
            );

            // -------------------------------------------------
            // SECOND PARTICIPANT JOINED
            // -------------------------------------------------
            if (
              message.type === "peer_joined"
            ) {
              setStatus(
                "Laptop connected. Establishing live camera..."
              );

              await createOffer();

              return;
            }

            // -------------------------------------------------
            // LAPTOP ANSWER
            // -------------------------------------------------
            if (
              message.type === "answer" &&
              peerRef.current
            ) {
              await peerRef.current.setRemoteDescription(
                message.answer
              );

              setStatus(
                "Live camera connected to InkSense."
              );

              return;
            }

            // -------------------------------------------------
            // ICE CANDIDATE
            // -------------------------------------------------
            if (
              message.type === "ice" &&
              message.candidate
            ) {
              if (
                peerRef.current &&
                peerRef.current.remoteDescription
              ) {
                try {
                  await peerRef.current.addIceCandidate(
                    message.candidate
                  );
                } catch (iceError) {
                  console.warn(
                    "Phone ICE candidate error:",
                    iceError
                  );
                }
              }

              return;
            }

            // -------------------------------------------------
            // LAPTOP LEFT
            // -------------------------------------------------
            if (
              message.type === "peer_left"
            ) {
              setStatus(
                "Laptop disconnected. Keep this page open."
              );
            }
          } catch (messageError) {
            console.error(
              "Phone signaling message error:",
              messageError
            );
          }
        };

        socket.onerror = (event) => {
          console.error(
            "InkSense phone WebSocket error:",
            event
          );

          if (!cancelled) {
            setError(
              "Unable to connect to the InkSense live session."
            );
          }
        };

        socket.onclose = (event) => {
          console.log(
            "InkSense phone WebSocket closed:",
            event.code,
            event.reason
          );

          if (!cancelled) {
            setStatus(
              "Live connection closed."
            );
          }
        };
      } catch (cameraError) {
        console.error(
          "Phone camera error:",
          cameraError
        );

        if (
          cameraError.name ===
          "NotAllowedError"
        ) {
          setError(
            "Camera permission was denied. Allow camera access and reload this page."
          );
        } else {
          setError(
            cameraError.message ||
              "Unable to start the phone camera."
          );
        }
      }
    };

    start();

    return () => {
      cleanup();
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
          Keep this page open. Your phone camera is being
          used as the live camera for the InkSense laptop
          dashboard.
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
              <span>
                Starting camera...
              </span>
            </div>
          )}
        </div>

        <div className="live-phone-status">
          {error ? (
            <span className="live-phone-error">
              {error}
            </span>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>{status}</span>
            </>
          )}
        </div>

        <p className="live-phone-code">
          Session:{" "}
          <strong>
            {code || "------"}
          </strong>
        </p>

        <button
          type="button"
          className="live-phone-refresh"
          onClick={() =>
            window.location.reload()
          }
        >
          <RefreshCcw size={17} />
          Restart Camera
        </button>

      </section>
    </main>
  );
}

export default LiveCameraPhone;