// Yol/zemin, paralaks arka plan ve tekrar-kullanılabilir (havuzlanmış)
// engel / toplanabilir / mermi nesneleri için fabrika fonksiyonları.
import * as THREE from 'three';
import { LANE_COUNT, LANE_WIDTH, SPAWN_Z } from './constants.js';
import { createGroundTexture, createSkylineTexture, createGlowSpriteTexture } from './effects.js';

const TRACK_WIDTH = LANE_WIDTH * LANE_COUNT;

export class Ground {
  constructor(scene) {
    this.texture = createGroundTexture();
    const mat = new THREE.MeshStandardMaterial({ map: this.texture, roughness: 0.95, metalness: 0.02 });
    const geo = new THREE.PlaneGeometry(TRACK_WIDTH + 1.2, 160, 1, 1);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(0, 0, -30);
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }

  update(delta, speed) {
    this.texture.offset.y += (speed * delta) / 8;
  }
}

export class Skyline {
  constructor(scene) {
    const tex = createSkylineTexture();
    tex.repeat.set(6, 1);
    this.texture = tex;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false });
    const geo = new THREE.PlaneGeometry(220, 30);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(0, 13, -55);
    scene.add(this.mesh);
  }

  update(delta, speed) {
    this.texture.offset.x += (speed * delta) / 140;
  }
}

/** Basit ışık noktacıklarından oluşan yıldız/parıltı zemin süsü (gece atmosferi). */
export function createAmbientFireflies(scene, count = 24) {
  const tex = createGlowSpriteTexture('#ffe9a8');
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 });
    const s = new THREE.Sprite(mat);
    s.scale.setScalar(0.15 + Math.random() * 0.2);
    s.position.set((Math.random() - 0.5) * TRACK_WIDTH * 3, 0.4 + Math.random() * 5, -Math.random() * 80);
    s.userData.baseY = s.position.y;
    s.userData.phase = Math.random() * Math.PI * 2;
    group.add(s);
  }
  scene.add(group);
  return {
    group,
    update(t) {
      for (const s of group.children) {
        s.position.y = s.userData.baseY + Math.sin(t * 1.2 + s.userData.phase) * 0.3;
      }
    },
  };
}

// ================= Genel Nesne Havuzu =================
export class ObjectPool {
  constructor(scene, factory, size) {
    this.items = [];
    for (let i = 0; i < size; i++) {
      const obj = factory();
      obj.visible = false;
      obj.userData.active = false;
      scene.add(obj);
      this.items.push(obj);
    }
  }

  acquire() {
    const obj = this.items.find((o) => !o.userData.active);
    if (!obj) return null;
    obj.userData.active = true;
    obj.visible = true;
    return obj;
  }

  release(obj) {
    obj.userData.active = false;
    obj.visible = false;
  }

  get active() {
    return this.items.filter((o) => o.userData.active);
  }
}

// ================= Yer Engelleri (Hacı Sadık modu) =================
function shadowify(obj) {
  obj.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return obj;
}

export function createCrate() {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.85, 0.85),
    new THREE.MeshStandardMaterial({ color: '#a9713f', roughness: 0.85 })
  );
  mesh.position.y = 0.425;
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.9), new THREE.MeshStandardMaterial({ color: '#6b4321', roughness: 0.8 }));
  strap.position.y = 0.425;
  g.add(shadowify(mesh), shadowify(strap));
  g.userData.radius = 0.6;
  g.userData.kind = 'crate';
  return g;
}

export function createBarrel() {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.95, 14),
    new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.6, metalness: 0.3 })
  );
  mesh.position.y = 0.475;
  const bandTop = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 16), new THREE.MeshStandardMaterial({ color: '#e8e2d0', metalness: 0.5, roughness: 0.4 }));
  bandTop.rotation.x = Math.PI / 2;
  bandTop.position.y = 0.75;
  const bandBottom = bandTop.clone();
  bandBottom.position.y = 0.2;
  g.add(shadowify(mesh), bandTop, bandBottom);
  g.userData.radius = 0.55;
  g.userData.kind = 'barrel';
  return g;
}

export function createCone() {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 0.85, 12),
    new THREE.MeshStandardMaterial({ color: '#ff7a1a', roughness: 0.7 })
  );
  mesh.position.y = 0.425;
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.14, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }));
  stripe.position.y = 0.42;
  g.add(shadowify(mesh), stripe);
  g.userData.radius = 0.5;
  g.userData.kind = 'cone';
  return g;
}

// ================= Hava Engelleri (Edibe Teyze modu) =================
export function createWashingLine() {
  const g = new THREE.Group();
  const wireMat = new THREE.MeshStandardMaterial({ color: '#20202a', roughness: 0.6 });
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, TRACK_WIDTH + 1, 6), wireMat);
  wire.rotation.z = Math.PI / 2;
  g.add(wire);
  const colors = ['#ff6b6b', '#ffd166', '#4cc9f0', '#f2f2f2'];
  for (let i = -1.5; i <= 1.5; i++) {
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.55), new THREE.MeshStandardMaterial({ color: colors[(i + 2) | 0], side: THREE.DoubleSide, roughness: 0.9 }));
    cloth.position.set(i * (LANE_WIDTH * 0.55), -0.32, 0);
    g.add(shadowify(cloth));
  }
  g.userData.radius = 0.65;
  g.userData.kind = 'washline';
  return g;
}

export function createSatelliteDish() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), new THREE.MeshStandardMaterial({ color: '#555a63', metalness: 0.5, roughness: 0.5 }));
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#dcdfe4', metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide })
  );
  dish.rotation.x = Math.PI * 0.65;
  dish.position.y = 0.55;
  g.add(shadowify(pole), shadowify(dish));
  g.userData.radius = 0.6;
  g.userData.kind = 'dish';
  return g;
}

export function createBirdFlock() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#2b2b38', roughness: 0.8 });
  for (let i = 0; i < 3; i++) {
    const bird = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 6), mat);
    body.rotation.x = Math.PI / 2;
    const wingGeo = new THREE.PlaneGeometry(0.32, 0.1);
    const wingL = new THREE.Mesh(wingGeo, mat);
    wingL.position.x = -0.16;
    wingL.rotation.y = 0.3;
    const wingR = wingL.clone();
    wingR.position.x = 0.16;
    wingR.rotation.y = -0.3;
    bird.add(shadowify(body), wingL, wingR);
    bird.position.set((Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.6);
    bird.userData.wingL = wingL;
    bird.userData.wingR = wingR;
    bird.userData.phase = Math.random() * Math.PI * 2;
    g.add(bird);
  }
  g.userData.radius = 0.55;
  g.userData.kind = 'birds';
  g.userData.birds = g.children;
  return g;
}

export function updateBirdFlock(group, time) {
  for (const bird of group.userData.birds || []) {
    const flap = Math.sin(time * 14 + bird.userData.phase) * 0.6;
    bird.userData.wingL.rotation.z = flap;
    bird.userData.wingR.rotation.z = -flap;
  }
}

// ================= Toplanabilirler & Mermi =================
export function createWaterBottle() {
  const g = new THREE.Group();
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#fff6d8', transparent: true, opacity: 0.55, roughness: 0.1, transmission: 0.4, thickness: 0.3 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.42, 12), glassMat);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.09, 10), new THREE.MeshStandardMaterial({ color: '#ffd93d' }));
  cap.position.y = 0.255;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.165, 0.16, 12), new THREE.MeshStandardMaterial({ color: '#ffd93d', emissive: '#8a6d00', emissiveIntensity: 0.3 }));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: createGlowSpriteTexture('#fff3b0'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
  glow.scale.setScalar(0.85);
  g.add(shadowify(body), cap, label, glow);
  g.userData.radius = 0.6;
  g.userData.kind = 'water';
  g.userData.spin = 1.6 + Math.random() * 0.6;
  return g;
}

export function createPerfumeProjectile() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.12), new THREE.MeshPhysicalMaterial({ color: '#ffe6f0', transparent: true, opacity: 0.75, roughness: 0.15, transmission: 0.3 }));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 8), new THREE.MeshStandardMaterial({ color: '#caa14a' }));
  cap.position.y = 0.16;
  g.add(shadowify(glass), cap);
  g.userData.radius = 0.32;
  return g;
}
