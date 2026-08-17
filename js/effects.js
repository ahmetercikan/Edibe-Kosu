// Prosedürel dokular (canvas ile üretilir, dışarıdan görsel dosyası gerekmez)
// ve parçacık / parlama efektleri.
import * as THREE from 'three';
import { LANE_COUNT, LANE_WIDTH } from './constants.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** 3 tonlu toon gölgelendirme için gradient haritası (cel-shading görünümü). */
export function createToonGradientTexture() {
  const tex = new THREE.DataTexture(
    new Uint8Array([90, 90, 110, 255, 154, 148, 173, 255, 216, 211, 230, 255, 255, 255, 255, 255]),
    4, 1, THREE.RGBAFormat
  );
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Yumuşak, ışıldayan bir daire sprite'ı — parçacıklar ve parlama efektleri için. */
export function createGlowSpriteTexture(hexColor = '#ffffff') {
  const size = 128;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, hexColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/** Genişleyen "şok dalgası" halkası — patlama anı için. */
export function createRingSpriteTexture() {
  const size = 128;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/** Zikzak bir şimşek sprite'ı — güçlenme (power-up) anı için. */
export function createLightningSpriteTexture() {
  const w = 96, h = 128;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.translate(w / 2, h / 2);
  ctx.shadowColor = 'rgba(255, 230, 120, 0.95)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.moveTo(6, -60);
  ctx.lineTo(-18, -6);
  ctx.lineTo(2, -6);
  ctx.lineTo(-10, 60);
  ctx.lineTo(20, -2);
  ctx.lineTo(0, -2);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/** Edibe Teyze'nin başörtüsü / elbisesi için çiçekli desen dokusu. */
export function createFloralTexture(baseColor = '#c23b64', accentColor = '#ffd166') {
  const size = 128;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = accentColor;
  for (let y = 12; y < size; y += 26) {
    for (let x = 12; x < size; x += 26) {
      const ox = (y / 26) % 2 === 0 ? 0 : 13;
      drawFlower(ctx, x + ox, y, 5);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.needsUpdate = true;
  return tex;
}

function drawFlower(ctx, cx, cy, r) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

/** Gökyüzü için dikey degrade doku (arka plan olarak kullanılır, sabit — kamera yönünden etkilenmez). */
export function createSkyTexture(topColor = '#4a9bdc', bottomColor = '#dff1ff', midColor = '#8ec7ef') {
  const c = makeCanvas(8, 256);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, topColor);
  grad.addColorStop(0.6, midColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 8, 256);

  // Birkaç yumuşak bulut lekesi
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 5; i++) {
    const y = 30 + Math.random() * 90;
    ctx.beginPath();
    ctx.ellipse(4, y, 3.4, 5 + Math.random() * 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/** Parke taşı (kaldırım taşı) zemin dokusu — dünyayla birlikte kaymaz, offset animasyonu ile hız hissi verir. */
export function createGroundTexture() {
  const w = 256, h = 512;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8c8072';
  ctx.fillRect(0, 0, w, h);

  // Parke taşı blokları
  const stoneW = 17, stoneH = 13;
  for (let row = 0; row * stoneH < h + stoneH; row++) {
    const offset = row % 2 === 0 ? 0 : stoneW / 2;
    for (let col = -1; col * stoneW < w + stoneW; col++) {
      const x = col * stoneW + offset;
      const y = row * stoneH;
      const shade = 0.82 + Math.random() * 0.3;
      const r = Math.round(150 * shade), g = Math.round(138 * shade), b = Math.round(120 * shade);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x + 1, y + 1, stoneW - 2, stoneH - 2);
    }
  }

  // Şerit ayraç çizgileri (soluk boya)
  ctx.strokeStyle = 'rgba(255,250,235,0.55)';
  ctx.lineWidth = 3.5;
  ctx.setLineDash([24, 20]);
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = (w / LANE_COUNT) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  // Kaldırım kenar çizgileri
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(255,250,240,0.65)';
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 0, w - 8, h);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 26);
  tex.anisotropy = 4;
  return tex;
}

/** Anadolu mahallesi silüeti — taş/tuğla evler, kiremit çatılar, minare ve elektrik telleri. */
export function createSkylineTexture() {
  const w = 1536, h = 384;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const groundY = h - 34;
  const wallColors = ['#d9b98c', '#c9a06f', '#e0c49a', '#b98f66'];
  const roofColors = ['#a5432c', '#8f3823', '#b8502f'];

  let x = 0;
  let poleX = [];
  while (x < w) {
    const bw = 90 + Math.random() * 70;
    const bh = 90 + Math.random() * 100;
    const top = groundY - bh;
    const wallColor = wallColors[(Math.random() * wallColors.length) | 0];
    const roofColor = roofColors[(Math.random() * roofColors.length) | 0];

    // Gövde
    ctx.fillStyle = wallColor;
    ctx.fillRect(x, top, bw, bh);

    // Kiremit çatı (üçgen)
    const roofH = 26 + Math.random() * 14;
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(x - 8, top);
    ctx.lineTo(x + bw / 2, top - roofH);
    ctx.lineTo(x + bw + 8, top);
    ctx.closePath();
    ctx.fill();

    // Pencereler
    ctx.fillStyle = 'rgba(70,50,40,0.55)';
    const cols = Math.max(1, Math.floor(bw / 26));
    const rows = Math.max(1, Math.floor(bh / 34));
    for (let ry = 0; ry < rows; ry++) {
      for (let rx = 0; rx < cols; rx++) {
        const wx = x + 10 + rx * 26;
        const wy = top + 14 + ry * 34;
        if (wx + 14 < x + bw && wy + 20 < top + bh) ctx.fillRect(wx, wy, 14, 20);
      }
    }

    if (Math.random() < 0.4) poleX.push(x + bw * 0.15 + Math.random() * bw * 0.7);
    x += bw + 14 + Math.random() * 18;
  }

  // Minare (cami minaresi) — mahalleye özgü bir siluet vurgusu
  const minX = w * (0.32 + Math.random() * 0.4);
  const minTop = groundY - 300;
  ctx.fillStyle = '#e7ddc9';
  ctx.fillRect(minX - 9, minTop + 40, 18, groundY - (minTop + 40));
  ctx.beginPath();
  ctx.arc(minX, minTop + 40, 16, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(minX - 6, minTop + 20);
  ctx.lineTo(minX, minTop - 22);
  ctx.lineTo(minX + 6, minTop + 20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e7ddc9';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(minX + 2, minTop - 26, 6, Math.PI * 1.1, Math.PI * 2.3);
  ctx.stroke();

  // Elektrik direkleri + sarkan teller
  ctx.strokeStyle = 'rgba(40,32,26,0.55)';
  ctx.lineWidth = 2;
  poleX = poleX.slice(0, 10);
  for (let i = 0; i < poleX.length; i++) {
    const px = poleX[i];
    ctx.beginPath();
    ctx.moveTo(px, groundY);
    ctx.lineTo(px, groundY - 70);
    ctx.stroke();
    if (i > 0) {
      const prev = poleX[i - 1];
      ctx.beginPath();
      ctx.moveTo(prev, groundY - 68);
      ctx.quadraticCurveTo((prev + px) / 2, groundY - 52, px, groundY - 68);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

// ============ Parçacık / Patlama Sistemi ============
// Havuzlanmış THREE.Sprite'lar ile CPU tarafında yönetilen basit ama etkili parçacıklar.

class ParticlePool {
  constructor(scene, texture, count, blending = THREE.AdditiveBlending) {
    this.scene = scene;
    this.pool = [];
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending,
        depthWrite: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      sprite.userData.life = 0;
      sprite.userData.maxLife = 1;
      sprite.userData.velocity = new THREE.Vector3();
      sprite.userData.spin = 0;
      scene.add(sprite);
      this.pool.push(sprite);
    }
    this.cursor = 0;
  }

  spawn({ position, velocity, color, size = 0.4, life = 0.5, gravity = 0 }) {
    const sprite = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;
    sprite.position.copy(position);
    sprite.userData.velocity.copy(velocity);
    sprite.userData.gravity = gravity;
    sprite.userData.life = life;
    sprite.userData.maxLife = life;
    sprite.userData.baseSize = size;
    sprite.material.color.set(color);
    sprite.material.opacity = 1;
    sprite.scale.setScalar(size);
    sprite.visible = true;
    return sprite;
  }

  update(delta) {
    for (const sprite of this.pool) {
      if (!sprite.visible) continue;
      sprite.userData.life -= delta;
      if (sprite.userData.life <= 0) {
        sprite.visible = false;
        continue;
      }
      const t = sprite.userData.life / sprite.userData.maxLife;
      sprite.userData.velocity.y -= (sprite.userData.gravity || 0) * delta;
      sprite.position.addScaledVector(sprite.userData.velocity, delta);
      sprite.material.opacity = t;
      sprite.scale.setScalar(sprite.userData.baseSize * (0.6 + 0.4 * t));
    }
  }
}

export class EffectsSystem {
  constructor(scene) {
    this.scene = scene;
    const glowTex = createGlowSpriteTexture('#ffffff');
    const ringTex = createRingSpriteTexture();
    const lightningTex = createLightningSpriteTexture();
    this.sparklePool = new ParticlePool(scene, glowTex, 90);
    this.burstPool = new ParticlePool(scene, glowTex, 120);
    this.ringPool = new ParticlePool(scene, ringTex, 12);
    this.lightningPool = new ParticlePool(scene, lightningTex, 14);
    this.flashLights = [];
    for (let i = 0; i < 4; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 6, 2);
      light.userData.life = 0;
      scene.add(light);
      this.flashLights.push(light);
    }
  }

  /** Sarıkız suyu toplama parlaması — sarı-altın ışıltı patlaması. */
  waterGlow(position) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      this.sparklePool.spawn({
        position,
        velocity: new THREE.Vector3(Math.cos(a) * speed, Math.random() * 3 + 1, Math.sin(a) * speed),
        color: Math.random() > 0.4 ? 0xffd93d : 0xfff3b0,
        size: 0.22 + Math.random() * 0.22,
        life: 0.5 + Math.random() * 0.35,
        gravity: 3,
      });
    }
    this._flash(position, 0xffe08a, 5, 0.35);
  }

  /** Hacı Sadık'ın Sarıkız suyuyla güçlenme anı — şimşekler + parlak flaş. */
  powerFlex(position) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.random() * 0.4;
      const radius = 0.55 + Math.random() * 0.3;
      const bolt = this.lightningPool.spawn({
        position: position.clone().add(new THREE.Vector3(Math.cos(a) * radius, Math.random() * 0.6 - 0.1, Math.sin(a) * radius)),
        velocity: new THREE.Vector3(Math.cos(a) * 0.4, 0.6, Math.sin(a) * 0.4),
        color: 0xffe066,
        size: 0.55 + Math.random() * 0.35,
        life: 0.4 + Math.random() * 0.2,
        gravity: 0,
      });
      bolt.material.rotation = a;
    }
    const ring = this.ringPool.spawn({
      position, velocity: new THREE.Vector3(0, 0, 0), color: 0xffe066, size: 0.5, life: 0.4,
    });
    ring.userData.growTo = 3.2;
    this._flash(position, 0xffe066, 6.5, 0.4);
  }

  /** Hacı parfümü şişesi patlaması — yoğun parçacık + halka + ışık flaşı. */
  perfumeExplosion(position) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const el = Math.random() * Math.PI * 0.5;
      const speed = 2.5 + Math.random() * 4.5;
      this.burstPool.spawn({
        position,
        velocity: new THREE.Vector3(
          Math.cos(a) * Math.cos(el) * speed,
          Math.sin(el) * speed + 1.5,
          Math.sin(a) * Math.cos(el) * speed
        ),
        color: [0xff8fa3, 0xffe08a, 0xbde0fe, 0xffffff][i % 4],
        size: 0.25 + Math.random() * 0.3,
        life: 0.45 + Math.random() * 0.4,
        gravity: 5,
      });
    }
    const ring = this.ringPool.spawn({
      position,
      velocity: new THREE.Vector3(0, 0, 0),
      color: 0xffffff,
      size: 0.4,
      life: 0.35,
    });
    ring.userData.isRing = true;
    ring.userData.growTo = 4.5;
    this._flash(position, 0xffffff, 6, 0.4);
  }

  hitSpark(position) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      this.sparklePool.spawn({
        position,
        velocity: new THREE.Vector3(Math.cos(a) * 3, Math.random() * 2, Math.sin(a) * 3),
        color: 0xff4d6d,
        size: 0.2,
        life: 0.3,
        gravity: 4,
      });
    }
    this._flash(position, 0xff4d6d, 4, 0.25);
  }

  _flash(position, color, intensity, life) {
    const light = this.flashLights.find((l) => l.userData.life <= 0) || this.flashLights[0];
    light.position.copy(position);
    light.color.set(color);
    light.intensity = intensity;
    light.userData.baseIntensity = intensity;
    light.userData.life = life;
    light.userData.maxLife = life;
  }

  update(delta) {
    this.sparklePool.update(delta);
    this.burstPool.update(delta);
    for (const ring of this.ringPool.pool) {
      if (!ring.visible) continue;
      ring.userData.life -= delta;
      if (ring.userData.life <= 0) { ring.visible = false; continue; }
      const t = 1 - ring.userData.life / ring.userData.maxLife;
      ring.scale.setScalar(THREE.MathUtils.lerp(0.4, ring.userData.growTo || 3, t));
      ring.material.opacity = 1 - t;
    }
    for (const light of this.flashLights) {
      if (light.userData.life <= 0) continue;
      light.userData.life -= delta;
      const t = Math.max(0, light.userData.life / light.userData.maxLife);
      light.intensity = t * t * (light.userData.baseIntensity || 6);
      if (light.userData.life <= 0) light.intensity = 0;
    }
  }
}
