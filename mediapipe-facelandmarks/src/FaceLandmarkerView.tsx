import React, { useEffect, useRef } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

type Props = {
  onUpdate: (point: NormalizedLandmark | null) => void;
  scale?: number; // scaling factor (0 < scale <= 1)
};

export const FaceLandmarkerView: React.FC<Props> = ({ onUpdate, scale = 1 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
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
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const detector = faceLandmarkerRef.current;
      const offscreen = offscreenCanvasRef.current;

      if (!video || !detector || video.videoWidth === 0 || video.videoHeight === 0) {
        animationFrameIdRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      // Scale video frame to smaller size for processing
      const scaledWidth = video.videoWidth * scale;
      const scaledHeight = video.videoHeight * scale;

      offscreen.width = scaledWidth;
      offscreen.height = scaledHeight;

      const offCtx = offscreen.getContext("2d");
      offCtx?.drawImage(video, 0, 0, scaledWidth, scaledHeight);

      const results = detector.detectForVideo(offscreen, performance.now());

      if (results.faceLandmarks?.length && canvas) {
        const point = results.faceLandmarks[0][168];
        onUpdate(point);

        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Resize canvas to video output
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          // Upscale and draw
          const upscaledLandmarks = results.faceLandmarks[0].map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
          }));

          drawLandmarks(upscaledLandmarks, ctx, canvas.width, canvas.height);
        }
      } else {
        onUpdate(null);
        const ctx = canvas?.getContext("2d");
        ctx?.clearRect(0, 0, canvas!.width, canvas!.height);
      }

      animationFrameIdRef.current = requestAnimationFrame(detectLoop);
    };

    init();

    return () => {
      isMounted = false;
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      faceLandmarkerRef.current?.close();
    };
  }, [onUpdate, scale]);

  return (
    <div style={{ position: "absolute", top: 0, left: 0, zIndex: 2 }}>
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        style={{ width: 100, borderRadius: "20px" }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 100,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
