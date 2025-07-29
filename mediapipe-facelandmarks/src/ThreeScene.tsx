import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import Stats from 'three/addons/libs/stats.module.js'
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

type Props = {
  facePoint: React.RefObject<NormalizedLandmark | null>;
};

export const ThreeScene: React.FC<Props> = ({ facePoint }) => {

  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const hdr = 'https://sbcode.net/img/venice_sunset_1k.hdr'
    new RGBELoader().load(hdr, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      scene.environment = texture
      scene.background = texture
    })

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202020);
    scene.backgroundBlurriness = 0.3;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 5);

    cameraRef.current = camera;
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 1, 1).normalize();
    //scene.add(directionalLight);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);

    console.log(width)
    console.log(height)

    rendererRef.current = renderer;

    const settings = {
      resolution: 0.5,
      offX: -0.14,
      offY: 0.25,
      offZ: 5.0,
      effectAmountX: 0.5,
      effectAmountY: 0.5,
      effectAmountZ: 0.5,
      x: 0.0,
      y: 0.0,
      z: 0.0
    };

    const gui = new GUI();
    const Offset = gui.addFolder('Settings')
    Offset.add(settings, 'resolution', 0.1, 1).step(0.01).name('Resolution');
    Offset.add(settings, 'offX', -2, 2).step(0.01);
    Offset.add(settings, 'offY', -2, 2).step(0.01);
    Offset.add(settings, 'offZ', 1, 10).step(0.01);
    Offset.add(settings, 'effectAmountX', 0, 1.5).step(0.01);
    Offset.add(settings, 'effectAmountY', 0, 1.5).step(0.01);
    Offset.add(settings, 'effectAmountZ', 0, 1.5).step(0.01);
    Offset.add(settings, 'x', -5, 5).step(0.01).name('Position X');
    Offset.add(settings, 'y', -5, 5).step(0.01).name('Position Y');
    Offset.add(settings, 'z', -5, 5).step(0.01).name('Position Z');


    let currentModel: THREE.Object3D | null = null;
    const modelOptions = {
      current: 'Scene1.glb',
      files: ['Scene1.glb', 'Scene2.glb', 'CocaCola.glb'] // Place these in public/Models/
    };


    let mixer: THREE.AnimationMixer | null = null;
    const loader = new GLTFLoader();
    function loadModel(fileName: string) {
      // Remove old model
      if (currentModel) {
        scene.remove(currentModel);
        mixer = null;
      }
      loader.load(
        `/Mediapipe/Models/${fileName}`,
        (gltf) => {
          currentModel = gltf.scene;
          currentModel.position.set(0, 0, 0);
          currentModel.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
          scene.add(currentModel);
          console.log('Model loaded:', currentModel);
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(currentModel); // mixer affects whole hierarchy
            gltf.animations.forEach((clip) => {
              const action = mixer!.clipAction(clip);
              action.play();
            });

            console.log('🎬 Playing animations:', gltf.animations.map(a => a.name));
          } else {
            console.warn('⚠️ No animations found in GLB file.');
          }
        },
        undefined,
        (error) => {
          console.error('An error happened while loading the GLB model:', error);
        }
      );
    }
    gui.add(modelOptions, 'current', modelOptions.files).name('GLB File').onChange((value) => {
      if (typeof value === "string" && value.trim() !== "") {
        loadModel(value);
      }
    });
    loadModel(modelOptions.current);

    var xs = 0.0
    var ys = 0.0
    var zs = 0.0
    const stats = new Stats()

    const clock = new THREE.Clock()
    const animate = () => {
      requestAnimationFrame(animate);
      currentModel?.position.set(settings.x, settings.y, settings.z);
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      const fp = facePoint.current;
      if (fp && cameraRef.current) {
        const x = -settings.effectAmountX * (fp.x - 0.5) * 4;
        const y = settings.effectAmountY * (0.5 - fp.y) * 3;
        const z = settings.effectAmountZ * fp.z * 40 + 3;
        xs = xs + (x - xs) / 19
        ys = ys + (y - ys) / 10
        zs = zs + (z - zs) / 10
        camera.setViewOffset(width, height, settings.effectAmountX * settings.offX * 1920 * xs, settings.effectAmountY * settings.offY * 1080 * ys, width, height)
        camera.setFocalLength(settings.offZ * zs)
        camera.position.set(xs, ys, zs)
        camera.updateMatrix()
      }
      renderer.setPixelRatio(settings.resolution);
      renderer.render(scene, camera);
      stats.update();
    };

    animate();
    document.body.appendChild(stats.dom)
    mountRef.current.appendChild(renderer.domElement);

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

  return <div ref={mountRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%" }} />;
};
