import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
//import { GUI } from 'dat.gui'
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

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
    console.log(width)
    console.log(height)
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add floor grid
    //const gridHelper = new THREE.GridHelper(10, 20);
    //scene.add(gridHelper);
        const settings = {
      offX: -0.14,
      offY: 0.25,
      offZ: 5.0,
      effectAmount: 0.5,
      x:0.0,
      y:0.0,
      z:0.0
    };
    const gui = new GUI();
    const Offset = gui.addFolder('Settings')
    Offset.add(settings,'offX',-2,2).step(0.01);
    Offset.add(settings,'offY',-2,2).step(0.01);
    Offset.add(settings,'offZ',1,10).step(0.01);
    Offset.add(settings,'effectAmount',0,1.5).step(0.01);


    const loader = new GLTFLoader();
    loader.load(
      '/Mediapipe/Models/Scene1.glb',
      (gltf) => {
        const model = gltf.scene;
        model.position.set(0, 0, 0);
        model.scale.set(0.3, 0.3, 0.3); // Adjust scale as needed
        scene.add(model);
        console.log('Model loaded:', model);
        Offset.add(model.position,'x',-5,5).step(0.01).name('Model X');
        Offset.add(model.position,'y',-5,5).step(0.01).name('Model Y');
        Offset.add(model.position,'z',-5,5).step(0.01).name('Model Z');
      },
      undefined,
      (error) => {
        console.error('An error happened while loading the GLB model:', error);
      }
    );
 
    var xs=0.0
    var ys=0.0
    var zs=0.0
    


    // Animate loop
    const animate = () => {
      requestAnimationFrame(animate);

      const fp = facePointRef.current;
      if (fp && cameraRef.current) {
        // Translate normalized point to world position
        const x = -settings.effectAmount*(fp.x - 0.5) * 4;
        const y = settings.effectAmount*(0.5 - fp.y) * 3;
        const z = settings.effectAmount*fp.z * 40 + 3;
        xs = xs +(x-xs)/4
        ys = ys +(y-ys)/4
        zs = zs +(z-zs)/4
        camera.setViewOffset(width,height,settings.effectAmount*settings.offX*1912*xs,settings.effectAmount*settings.offY*934*ys,width,height)
        camera.setFocalLength(settings.offZ*zs)
        camera.position.set(xs,ys,zs)
        camera.updateMatrix
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

  return <div ref={mountRef} style={{position:"fixed",top:0,left:0, width: "100%", height: "100%" }} />;
};
