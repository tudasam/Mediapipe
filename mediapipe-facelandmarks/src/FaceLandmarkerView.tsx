import React, { useEffect, useRef } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

type Props = {
  onUpdate: (point: NormalizedLandmark | null) => void;
};

export const FaceLandmarkerView: React.FC<Props> = ({ onUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const drawLandmarks = (
      landmarks: NormalizedLandmark[],
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number
    ) => {
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "red";
      for (const landmark of landmarks) {
        const x = landmark.x * width;
        const y = landmark.y * height;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    };

    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );

      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
        runningMode: "VIDEO",
        numFaces: 1,
      });

      if (!isMounted) return;
      faceLandmarkerRef.current = faceLandmarker;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current
            ?.play()
            .catch((e) => console.warn("Video play() failed:", e));
          detectLoop();
        };
      }
    };

    const detectLoop = () => {
      if (
        !videoRef.current ||
        !faceLandmarkerRef.current ||
        videoRef.current.videoWidth === 0 ||
        videoRef.current.videoHeight === 0
      ) {
        animationFrameIdRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      const results = faceLandmarkerRef.current.detectForVideo(
        videoRef.current,
        performance.now()
      );

      if (results.faceLandmarks?.length && canvasRef.current) {
        const point = results.faceLandmarks[0][168];
        onUpdate(point);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Resize canvas if video size changed
          if (
            canvas.width !== videoRef.current.videoWidth ||
            canvas.height !== videoRef.current.videoHeight
          ) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
          }
          drawLandmarks(results.faceLandmarks[0], ctx, canvas.width, canvas.height);
        }
      } else {
        onUpdate(null);
        // Clear canvas if no face detected
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          ctx?.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(detectLoop);
    };

    init();

    return () => {
      isMounted = false;
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      faceLandmarkerRef.current?.close();
    };
  }, [onUpdate]);

  return (
    <div style={{ position: "absolute", top:0,left:0, zIndex:2}}>
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        style={{ width: "480px", height: "360px", borderRadius: "0px"  }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "480px",
          height: "360px",
          pointerEvents: "none",
          
        }}
      />
    </div>
  );
};


