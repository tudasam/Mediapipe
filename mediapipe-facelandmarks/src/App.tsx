import  { useRef } from "react";
import { FaceLandmarkerView } from "./FaceLandmarkerView";
import { ThreeScene } from "./ThreeScene";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

function getScaleFromUrl(): number {
  const params = new URLSearchParams(window.location.search);
  const scaleParam = params.get("scale");
  let scale = parseFloat(scaleParam ?? "");
  if (isNaN(scale) || scale <= 0 || scale > 1) {
    scale = 1; // fallback default scale
  }
  return scale;
}

function App() {
  const facePointRef = useRef<NormalizedLandmark | null>(null);
  const scale = getScaleFromUrl();
  console.log("Scale from URL:", scale);
  return (
    <>
      <FaceLandmarkerView scale={scale} onUpdate={(point) => {
        facePointRef.current = point;
      }} />
      <ThreeScene facePoint={facePointRef} />
    </>
  );
}

export default App;


