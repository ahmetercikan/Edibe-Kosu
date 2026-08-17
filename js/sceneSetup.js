// Renderer, kamera, ışıklandırma ve post-processing (bloom) kurulumu.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createSkyTexture } from './effects.js';

export function createSceneSetup(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = createSkyTexture('#4a9bdc', '#dff1ff');
  scene.fog = new THREE.Fog(0xbfe0ff, 26, 68);

  const camera = new THREE.PerspectiveCamera(
    58,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 4.4, 8.5);

  // ---- Işıklandırma (gündüz mahalle atmosferi) ----
  const hemi = new THREE.HemisphereLight(0xcfe9ff, 0x7a6650, 1.0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff3d6, 1.9);
  sun.position.set(-8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0015;
  scene.add(sun);
  scene.add(sun.target);

  const rim = new THREE.DirectionalLight(0xfff0cf, 0.35);
  rim.position.set(6, 5, -8);
  scene.add(rim);

  // ---- Post-processing (bloom: parlama efektleri için) ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6,    // strength — parlak gündüz gökyüzünün aşırı ışıldamasını önlemek için düşürüldü
    0.5,    // radius
    0.86    // threshold — sadece gerçekten emissive/parlak materyaller ışıldar
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  /** Düşük performanslı cihazlarda kaliteyi otomatik olarak düşürür. */
  function degradeQuality() {
    bloomPass.enabled = false;
    renderer.shadowMap.enabled = false;
    sun.castShadow = false;
    renderer.setPixelRatio(1);
  }

  return { renderer, scene, camera, composer, sun, resize, degradeQuality };
}
