import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { lerp } from "three/src/math/MathUtils.js";

type Props = {
  facePoint: NormalizedLandmark | null;
};

export const ThreeScene: React.FC<Props> = ({ facePoint }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const facePointRef = useRef<NormalizedLandmark | null>(null);

  // Keep facePoint ref up-to-date
  useEffect(() => {
    facePointRef.current = facePoint;
  }, [facePoint]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202020);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 5);
    //camera.lookAt(0, 1.6, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add floor grid
    const gridHelper = new THREE.GridHelper(10, 20);
    scene.add(gridHelper);

    // Add a visible cube
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    cube.position.set(0, 0, 0);
    scene.add(cube);

    var xs=0.0
    var ys=0.0
    var zs=0.0

    // Animate loop
    const animate = () => {
      requestAnimationFrame(animate);

      const fp = facePointRef.current;
      if (fp && cameraRef.current) {
        // Translate normalized point to world position
        const x = -(fp.x - 0.5) * 4;
        const y = (0.5 - fp.y) * 3;
        const z = fp.z * 20 + 3;
        xs = xs +(x-xs)/20
        ys = ys +(y-ys)/20
        zs = zs +(z-zs)/20

        const target = new THREE.Vector3(x, y, z);
        
        
        camera.setViewOffset(width,height,-0.7*width*xs,0.7*height*ys,width,height)
        camera.setFocalLength(5*zs)
        
        cameraRef.current.position.lerp(target, 0.1);
        camera.updateMatrix
        //cameraRef.current.lookAt(0, 1.6, 0);
      }

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      if (!renderer || !camera) return;
      const width = mountRef.current!.clientWidth;
      const height = mountRef.current!.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "500px" }} />;
};
