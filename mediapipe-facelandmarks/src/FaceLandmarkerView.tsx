import React, { useEffect, useRef } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

type Props = {
  onUpdate: (point: NormalizedLandmark | null) => void;
  scale?: number;
};

export const FaceLandmarkerView: React.FC<Props> = ({ onUpdate, scale = 1 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const PROCESS_INTERVAL = 1000 / 30; // 15 FPS

  useEffect(() => {
    let isMounted = true;
    let animationFrameId: number;

    const drawLandmarks = (
      landmarks: NormalizedLandmark[],
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number
    ) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "red";
      for (const { x, y } of landmarks) {
        ctx.beginPath();
        ctx.arc(x * width, y * height, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const ensureCanvasSize = (canvas: HTMLCanvasElement, width: number, height: number) => {
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const detectFrame = async (time: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const detector = faceLandmarkerRef.current;
      const offscreen = offscreenCanvasRef.current;

      if (!video || !canvas || !detector || video.videoWidth === 0 || video.videoHeight === 0) {
        scheduleNext();
        return;
      }

      if (time - lastTimestampRef.current < PROCESS_INTERVAL) {
        scheduleNext();
        return;
      }
      lastTimestampRef.current = time;

      const scaledWidth = video.videoWidth * scale;
      const scaledHeight = video.videoHeight * scale;
      offscreen.width = scaledWidth;
      offscreen.height = scaledHeight;

      const offCtx = offscreen.getContext("2d");
      offCtx?.drawImage(video, 0, 0, scaledWidth, scaledHeight);

      const results = detector.detectForVideo(offscreen, time);

      const landmarks = results.faceLandmarks?.[0];
      if (landmarks) {
        onUpdate(landmarks[168]);

        if (!ctxRef.current) {
          ctxRef.current = canvas.getContext("2d");
        }

        const ctx = ctxRef.current;
        if (ctx) {
          ensureCanvasSize(canvas, video.videoWidth, video.videoHeight);
          drawLandmarks(landmarks, ctx, canvas.width, canvas.height);
        }
      } else {
        onUpdate(null);
        ctxRef.current?.clearRect(0, 0, canvas.width, canvas.height);
      }

      scheduleNext();
    };

    const scheduleNext = () => {
      const video = videoRef.current;
      if (video && "requestVideoFrameCallback" in video) {
        (video as any).requestVideoFrameCallback(detectFrame);
      } else {
        animationFrameId = requestAnimationFrame(detectFrame);
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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => scheduleNext()).catch(console.warn);
        };
      }
    };

    init();

    return () => {
      isMounted = false;
      faceLandmarkerRef.current?.close();
      cancelAnimationFrame(animationFrameId);
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
