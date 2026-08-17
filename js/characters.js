// Prosedürel düşük-poligon karakter rig'leri (dış model dosyası gerektirmez)
// + toon gölgelendirme ve basit iskelet-benzeri (pivot tabanlı) animasyonlar.
import * as THREE from 'three';
import { createToonGradientTexture, createFloralTexture, createGlowSpriteTexture } from './effects.js';

const gradientMap = createToonGradientTexture();

function toon(color, extra = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap, ...extra });
}

function limb(radiusTop, radiusBottom, length, material, segments = 8) {
  // Pivot orijinde (omuz/kalça); mesh aşağı doğru uzanır ki döndürüldüğünde doğal sallansın.
  const pivot = new THREE.Group();
  const geo = new THREE.CapsuleGeometry(radiusTop, Math.max(length - radiusTop * 2, 0.05), 4, segments);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  pivot.add(mesh);
  pivot.userData.length = length;
  return pivot;
}

function shadowify(obj) {
  obj.traverse((c) => {
    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
  });
  return obj;
}

// ================= HACI SADIK =================
export function createHaciSadik() {
  const root = new THREE.Group();
  root.name = 'haciSadik';

  const skin = toon('#e3b184');
  const coat = toon('#c9a06f');
  const trouser = toon('#4a3826');
  const capMat = toon('#f5f0e6');
  const bandMat = toon('#151318');
  const sashMat = toon('#b5342c');
  const bottleGlass = toon('#dceeff', { transparent: true, opacity: 0.85 });
  const bottleCap = toon('#c99a3b');
  const caneMat = toon('#7a5230');

  // Gövde
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.62, 4, 10), coat);
  torso.position.y = 1.08;
  root.add(shadowify(torso));

  // Bel kuşağı (kırmızı kuşak)
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 12), sashMat);
  sash.position.y = 0.86;
  root.add(shadowify(sash));

  // Baş grubu
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.78;
  root.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), skin);
  headGroup.add(shadowify(head));

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.1), capMat);
  cap.position.y = 0.2;
  headGroup.add(shadowify(cap));

  // Görme engelli olduğunu belirten koyu gözlük bandı
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.12), bandMat);
  band.position.set(0, 0.02, 0.26);
  headGroup.add(band);

  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.06), bandMat);
  mustache.position.set(0, -0.14, 0.28);
  headGroup.add(mustache);

  // Kollar
  const armL = limb(0.11, 0.09, 0.56, coat);
  armL.position.set(-0.48, 1.55, 0);
  root.add(armL);
  const armR = limb(0.11, 0.09, 0.56, coat);
  armR.position.set(0.48, 1.55, 0);
  root.add(armR);

  // Baston (sağ ele bağlı)
  const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.95, 8), caneMat);
  cane.position.set(0, -0.75, 0.05);
  cane.rotation.z = 0.12;
  armR.add(shadowify(cane));

  // Parfüm şişesi bandolyeri (görsel — envanter fırlatma anında kaybolmaz, sadece süs)
  for (let i = -1; i <= 1; i++) {
    const bottle = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.16, 8), bottleGlass);
    const bcap = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.05, 8), bottleCap);
    bcap.position.y = 0.105;
    bottle.add(glass, bcap);
    bottle.position.set(i * 0.16, 1.15, 0.36);
    bottle.rotation.x = 0.25;
    root.add(bottle);
  }

  // Bacaklar
  const legL = limb(0.13, 0.12, 0.72, trouser);
  legL.position.set(-0.17, 0.72, 0);
  root.add(legL);
  const legR = limb(0.13, 0.12, 0.72, trouser);
  legR.position.set(0.17, 0.72, 0);
  root.add(legR);

  root.userData = { headGroup, armL, armR, legL, legR, torso, kind: 'haci' };
  return root;
}

// ================= EDİBE TEYZE + UÇAN SÜPÜRGE =================
export function createEdibeTeyze() {
  const rig = new THREE.Group();
  rig.name = 'edibeRig';

  const skin = toon('#e6bb92');
  const scarfMat = toon('#7a2048');
  const floralTex = createFloralTexture('#c23b64', '#ffd873');
  const dressMat = new THREE.MeshToonMaterial({ map: floralTex, gradientMap });
  const metal = new THREE.MeshStandardMaterial({ color: '#c9d2da', metalness: 0.75, roughness: 0.3 });
  const metalDark = new THREE.MeshStandardMaterial({ color: '#4a4f57', metalness: 0.6, roughness: 0.4 });
  const glow = new THREE.MeshBasicMaterial({ color: '#7fe7ff' });

  const body = new THREE.Group();
  rig.add(body);

  // --- Edibe Teyze figürü ---
  const person = new THREE.Group();
  person.position.y = 0.62;
  body.add(person);

  const dress = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.0, 12), dressMat);
  dress.position.y = 0.5;
  person.add(shadowify(dress));

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.3, 4, 10), dressMat);
  torso.position.y = 1.0;
  person.add(shadowify(torso));

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.5;
  person.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), skin);
  headGroup.add(shadowify(head));

  const scarf = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.5, 14, 1, true), scarfMat);
  scarf.position.y = 0.06;
  scarf.rotation.x = Math.PI;
  headGroup.add(shadowify(scarf));
  const scarfCap = new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), scarfMat);
  scarfCap.position.y = 0.02;
  headGroup.add(scarfCap);

  const armL = limb(0.09, 0.08, 0.46, dressMat);
  armL.position.set(-0.34, 1.15, 0.1);
  armL.rotation.x = -1.1;
  person.add(armL);
  const armR = limb(0.09, 0.08, 0.46, dressMat);
  armR.position.set(0.34, 1.15, 0.1);
  armR.rotation.x = -1.1;
  person.add(armR);

  // --- Ultra elektrikli süpürge ---
  const vacuum = new THREE.Group();
  vacuum.position.set(0, 0.05, 0.35);
  body.add(vacuum);

  const vBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.9, 4, 10), metal);
  vBody.rotation.z = Math.PI / 2;
  vacuum.add(shadowify(vBody));

  const vStripe = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.02, 8, 16), metalDark);
  vStripe.rotation.y = Math.PI / 2;
  vacuum.add(vStripe);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 12, Math.PI), metalDark);
  handle.position.set(0.05, 0.35, -0.15);
  handle.rotation.set(0, Math.PI / 2, 0);
  vacuum.add(handle);

  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 10), metalDark);
  nozzle.rotation.z = Math.PI / 2;
  nozzle.position.set(-0.65, -0.02, 0);
  vacuum.add(shadowify(nozzle));

  const thruster = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 10), glow);
  thruster.rotation.z = -Math.PI / 2;
  thruster.position.set(0.62, 0, 0);
  vacuum.add(thruster);

  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createGlowSpriteTexture('#7fe7ff'),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  glowSprite.scale.setScalar(0.9);
  glowSprite.position.set(0.66, 0, 0);
  vacuum.add(glowSprite);

  body.position.y = 1.0;

  rig.userData = { body, headGroup, armL, armR, vacuum, thruster, kind: 'edibe' };
  return rig;
}

// ================= DEVRİM (torun) =================
export function createDevrim() {
  const root = new THREE.Group();
  root.name = 'devrim';

  const skin = toon('#f0c49a');
  const shirt = toon('#2ec4b6');
  const shorts = toon('#264653');
  const capeMat = new THREE.MeshBasicMaterial({ color: '#ff9f1c', side: THREE.DoubleSide });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.32, 4, 10), shirt);
  torso.position.y = 0.66;
  root.add(shadowify(torso));

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.05;
  root.add(headGroup);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), skin);
  headGroup.add(shadowify(head));
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.205, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.4), toon('#3a2a1e'));
  hair.position.y = 0.06;
  headGroup.add(hair);

  const armL = limb(0.06, 0.05, 0.32, shirt);
  armL.position.set(-0.28, 0.82, 0);
  root.add(armL);
  const armR = limb(0.06, 0.05, 0.32, shirt);
  armR.position.set(0.28, 0.82, 0);
  root.add(armR);

  const legL = limb(0.075, 0.065, 0.42, shorts);
  legL.position.set(-0.11, 0.42, 0);
  root.add(legL);
  const legR = limb(0.075, 0.065, 0.42, shorts);
  legR.position.set(0.11, 0.42, 0);
  root.add(legR);

  const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.5, 4, 4), capeMat);
  cape.position.set(0, 0.7, -0.2);
  cape.rotation.x = 0.25;
  root.add(cape);

  root.userData = { headGroup, armL, armR, legL, legR, cape, kind: 'devrim' };
  return root;
}

// ================= ANİMASYON YARDIMCILARI =================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Yürüme/koşma çevrimi — kol ve bacakları zıt fazda sallar. */
export function animateRunCycle(userData, time, intensity = 1) {
  const freq = 9 * intensity;
  const amp = 0.55 * clamp(intensity, 0.3, 1.6);
  const swing = Math.sin(time * freq);
  if (userData.legL) userData.legL.rotation.x = swing * amp;
  if (userData.legR) userData.legR.rotation.x = -swing * amp;
  if (userData.headGroup) userData.headGroup.rotation.z = Math.sin(time * freq * 0.5) * 0.04;
  if (userData.cape) {
    userData.cape.rotation.z = Math.sin(time * freq * 0.6) * 0.25;
    userData.cape.rotation.x = 0.25 + Math.sin(time * freq * 0.5 + 1) * 0.12;
  }

  const flexPulse = getFlexPulse(userData, time);
  if (flexPulse > 0) {
    // Sarıkız suyu içildiğinde: kollar şimşekli bir "güçlenme" pozuna kalkar.
    if (userData.armL) userData.armL.rotation.x = THREE.MathUtils.lerp(-swing * amp * 0.8, -2.35, flexPulse);
    if (userData.armR) userData.armR.rotation.x = THREE.MathUtils.lerp(swing * amp * 0.8, -2.35, flexPulse);
    if (userData.armL) userData.armL.rotation.z = THREE.MathUtils.lerp(0, -0.5, flexPulse);
    if (userData.armR) userData.armR.rotation.z = THREE.MathUtils.lerp(0, 0.5, flexPulse);
    if (userData.torso) userData.torso.scale.setScalar(1 + flexPulse * 0.22);
  } else if (userData.torso) {
    userData.torso.scale.setScalar(1);
    if (userData.armL) userData.armL.rotation.x = -swing * amp * 0.8;
    if (userData.armR) userData.armR.rotation.x = swing * amp * 0.8;
    if (userData.armL) userData.armL.rotation.z = 0;
    if (userData.armR) userData.armR.rotation.z = 0;
  } else {
    if (userData.armL) userData.armL.rotation.x = -swing * amp * 0.8;
    if (userData.armR) userData.armR.rotation.x = swing * amp * 0.8;
  }
}

const FLEX_DURATION = 0.6;

function getFlexPulse(userData, time) {
  if (userData.flexStartTime === undefined) return 0;
  const el = time - userData.flexStartTime;
  if (el < 0 || el >= FLEX_DURATION) {
    userData.flexStartTime = undefined;
    return 0;
  }
  return Math.sin((el / FLEX_DURATION) * Math.PI);
}

/** Sarıkız suyu içildiğinde tetiklenen kısa "güçlenme" pozu. */
export function triggerFlexPose(userData, time) {
  userData.flexStartTime = time;
}

/** Edibe Teyze'nin uçuş animasyonu: hafif yükselip alçalma + dönüşlerde yatış. */
export function animateFlight(userData, time, lateralVelocity = 0) {
  if (userData.body) {
    userData.body.position.y = 1.0 + Math.sin(time * 3.2) * 0.09;
    userData.body.rotation.z = clamp(-lateralVelocity * 0.12, -0.4, 0.4);
    userData.body.rotation.x = Math.sin(time * 2.1) * 0.03;
  }
  if (userData.armL) userData.armL.rotation.x = -1.1 + Math.sin(time * 3.2) * 0.05;
  if (userData.armR) userData.armR.rotation.x = -1.1 + Math.sin(time * 3.2 + 0.4) * 0.05;
  if (userData.headGroup) userData.headGroup.rotation.z = Math.sin(time * 2.4) * 0.05;
  if (userData.thruster) userData.thruster.scale.setScalar(1 + Math.sin(time * 30) * 0.08);
}

/** Karakteri yana eğerek şerit değişimini vurgular (bank into turn). */
export function applyLaneBank(rootOrGroup, lateralVelocity) {
  rootOrGroup.rotation.z = THREE.MathUtils.lerp(
    rootOrGroup.rotation.z,
    clamp(-lateralVelocity * 0.1, -0.3, 0.3),
    0.2
  );
}
