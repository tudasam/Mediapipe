import React, { useEffect, useRef } from "react";
import * as THREE from "three";

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

type Props = {
  facePoint: NormalizedLandmark | null;
};

export const ThreeScene: React.FC<Props> = ({ facePoint }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const textMeshRef = useRef<THREE.Sprite | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202020);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 3);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Grid helper (floor)
    const gridHelper = new THREE.GridHelper(10, 20);
    scene.add(gridHelper);

    // Create text mesh for camera coordinates
    const createTextTexture = (text: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "24px monospace";
      ctx.fillStyle = "white";
      ctx.fillText(text, 10, 40);
      return new THREE.CanvasTexture(canvas);
    };

    let textTexture = createTextTexture("Camera: 0, 0, 0");

    const textMaterial = new THREE.SpriteMaterial({ map: textTexture });
    const textSprite = new THREE.Sprite(textMaterial);
    textSprite.position.set(0, 2, 0);
    textSprite.scale.set(3, 0.75, 1);
    scene.add(textSprite);
    textMeshRef.current = textSprite;

    // Animate loop
    const animate = () => {
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

      // If facePoint available, move camera smoothly
      if (facePoint) {
        const x = (facePoint.x - 0.5) * 4;
        const y = (0.5 - facePoint.y) * 3 + 1.6;
        const z = facePoint.z * 5 + 3;

        cameraRef.current.position.lerp(new THREE.Vector3(x, y, z), 0.1);
        cameraRef.current.lookAt(0, 1, 0);
      }

      // Update camera coords text
      const pos = cameraRef.current.position;
      const canvas = textMeshRef.current!.material.map.image;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "12px monospace";
      ctx.fillStyle = "white";
      ctx.fillText(
        `Camera: ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`,
        10,
        40
      );
      textMeshRef.current!.material.map.needsUpdate = true;

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const onResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [facePoint]);

  return <div ref={mountRef} style={{ width: "100%", height: "500px" }} />;
};



