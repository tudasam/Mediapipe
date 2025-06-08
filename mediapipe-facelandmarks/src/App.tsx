import React, { useState } from "react";
import { FaceLandmarkerView } from "./FaceLandmarkerView";
import { ThreeScene } from "./ThreeScene";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

function App() {
  const [facePoint, setFacePoint] = useState<NormalizedLandmark | null>(null);

  return (
    <>
      <FaceLandmarkerView onUpdate={setFacePoint} />
      <ThreeScene facePoint={facePoint} />
    </>
  );
}

export default App;


