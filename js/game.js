// Oyun durum makinesi, oynanış döngüsü, çarpışmalar, skor ve HUD.
import * as THREE from 'three';
import { createSceneSetup } from './sceneSetup.js';
import {
  createHaciSadik, createEdibeTeyze, createDevrim,
  animateRunCycle, animateFlight, applyLaneBank, triggerFlexPose,
} from './characters.js';
import {
  Ground, Skyline, createAmbientFireflies, ObjectPool,
  createCrate, createBarrel, createCone,
  createWashingLine, createSatelliteDish, createBirdFlock, updateBirdFlock,
  createWaterBottle, createPerfumeProjectile,
} from './world.js';
import { EffectsSystem } from './effects.js';
import { InputController } from './input.js';
import { AudioSystem } from './audio.js';
import * as C from './constants.js';
import { authService } from './services/authService.js';

const clampX = (v, a, b) => Math.max(a, Math.min(b, v));

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ui = this._collectUI();
    this.audio = new AudioSystem();
    this.input = new InputController();
    this.mode = C.MODE.HACI;
    this.state = 'loading';
    this.bestScores = {
      [C.MODE.HACI]: Number(localStorage.getItem('mk_best_haci') || 0),
      [C.MODE.EDIBE]: Number(localStorage.getItem('mk_best_edibe') || 0),
    };

    this._bindMenuEvents();
    this._bindInput();
  }

  _collectUI() {
    const $ = (id) => document.getElementById(id);
    return {
      overlay: $('overlay'),
      hud: $('hud'),
      screens: {
        loading: $('screen-loading'),
        webglError: $('screen-webgl-error'),
        menu: $('screen-menu'),
        howto: $('screen-howto'),
        modeSelect: $('screen-mode-select'),
        pause: $('screen-pause'),
        gameover: $('screen-gameover'),
      },
      scoreValue: $('score-value'),
      lifeFill: $('life-fill'),
      energyFill: $('energy-fill'),
      levelPill: $('level-pill'),
      muteBtn: $('mute-btn'),
      swipeHint: $('swipe-hint'),
      chaseWrap: $('chase-wrap'),
      chaseFill: $('chase-fill'),
      powerBanner: $('power-banner'),
      bestScoreLabel: $('best-score-label'),
      finalScore: $('final-score'),
      gameoverBest: $('gameover-best'),
      gameoverTitle: $('gameover-title'),
      pauseBtn: $('pause-btn'),
    };
  }

  _showScreen(name) {
    for (const key of Object.keys(this.ui.screens)) {
      this.ui.screens[key].classList.toggle('hidden', key !== name);
    }
    this.ui.overlay.classList.remove('hidden');
  }

  _hideOverlay() { this.ui.overlay.classList.add('hidden'); }

  _bindMenuEvents() {
    const click = (id, fn) => document.getElementById(id).addEventListener('click', () => { this.audio.uiClick(); fn(); });
    click('btn-play', () => this._showScreen('modeSelect'));
    click('btn-howto', () => this._showScreen('howto'));
    click('btn-howto-back', () => this._showScreen('menu'));
    click('btn-mode-back', () => this._showScreen('menu'));
    click('mode-haci', () => this.startRun(C.MODE.HACI));
    click('mode-edibe', () => this.startRun(C.MODE.EDIBE));
    click('btn-resume', () => this.resume());
    click('btn-quit', () => this.returnToMenu());
    click('btn-retry', () => this.startRun(this.mode));
    click('btn-change-mode', () => this._showScreen('modeSelect'));
    this.ui.pauseBtn.addEventListener('click', () => this.togglePause());
    this.ui.muteBtn.addEventListener('click', () => {
      const enabled = !this.audio.enabled;
      this.audio.setEnabled(enabled);
      this.ui.muteBtn.textContent = enabled ? '🔊' : '🔇';
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });
  }

  _bindInput() {
    this.input.on('laneChange', (dir) => {
      if (this.state !== 'playing') return;
      this.player.targetLane = clampX(this.player.targetLane + dir, 0, C.LANE_COUNT - 1);
      this._dismissSwipeHint();
    });
    this.input.on('action', () => {
      if (this.state !== 'playing') return;
      if (this.mode === C.MODE.HACI) this._throwPerfume();
      else this._boost();
    });
    this.input.on('pauseToggle', () => {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    });
  }

  // ================= Kurulum =================
  async init() {
    try {
      const setup = createSceneSetup(this.canvas);
      Object.assign(this, setup); // renderer, scene, camera, composer, sun, resize, degradeQuality
    } catch (err) {
      console.error(err);
      this._showScreen('webglError');
      return;
    }
    if (!this.renderer.getContext()) {
      this._showScreen('webglError');
      return;
    }

    this.clock = new THREE.Clock();
    this.effects = new EffectsSystem(this.scene);
    this.ground = new Ground(this.scene);
    this.skyline = new Skyline(this.scene);
    this.fireflies = createAmbientFireflies(this.scene);

    this.pools = {
      ground: [
        new ObjectPool(this.scene, createCrate, 6),
        new ObjectPool(this.scene, createBarrel, 6),
        new ObjectPool(this.scene, createCone, 6),
      ],
      air: [
        new ObjectPool(this.scene, createWashingLine, 5),
        new ObjectPool(this.scene, createSatelliteDish, 5),
        new ObjectPool(this.scene, createBirdFlock, 5),
      ],
      water: new ObjectPool(this.scene, createWaterBottle, 8),
      projectiles: new ObjectPool(this.scene, createPerfumeProjectile, 6),
    };

    this.haciRig = createHaciSadik();
    this.edibeRig = createEdibeTeyze();
    this.devrimRig = createDevrim();
    this.scene.add(this.haciRig, this.edibeRig, this.devrimRig);
    this.haciRig.visible = false;
    this.edibeRig.visible = false;
    this.devrimRig.visible = false;

    this._camLookAt = new THREE.Vector3(0, 1.4, -6);
    this._camShake = { time: 0, strength: 0 };

    this._updateBestLabel();
    this._showScreen('menu');
    this._loop();
  }

  _updateBestLabel() {
    const best = Math.max(this.bestScores.haci, this.bestScores.edibe);
    this.ui.bestScoreLabel.textContent = best > 0 ? `En iyi skor: ${best}` : '';
  }

  // ================= Koşu Başlatma =================
  startRun(mode) {
    this.mode = mode;
    this.state = 'playing';
    this._hideOverlay();
    this.ui.hud.classList.remove('hidden');
    this.ui.chaseWrap.classList.toggle('hidden', mode !== C.MODE.EDIBE);

    this.haciRig.visible = mode === C.MODE.HACI;
    this.edibeRig.visible = mode === C.MODE.EDIBE;
    this.devrimRig.visible = mode === C.MODE.EDIBE;

    for (const pool of [...this.pools.ground, ...this.pools.air, this.pools.water, this.pools.projectiles]) {
      for (const item of pool.active) pool.release(item);
    }

    this.score = 0;
    this.elapsed = 0;
    this.spawnTimer = 0.6;
    this.waterSpawnTimer = 1.4;

    this.player = {
      lane: 1,
      targetLane: 1,
      x: C.LANE_X[1],
      lateralVel: 0,
      lives: C.START_LIVES,
      invulnTimer: 0,
      shieldActive: false,
      speedBoostTimer: 0,
      ammo: 3,
      ammoRegenTimer: 0,
      throwCooldown: 0,
      boostCooldown: 0,
    };

    this.devrim = {
      lane: 1,
      targetLane: 1,
      x: C.LANE_X[1],
      gapZ: C.CHASE_START_GAP,
      changeTimer: 1.2,
      difficulty: 0,
    };

    this._setScore(0);
    this._updateLifeBar();
    this._updateEnergyBar();
    this._updateLevel();
    this._showSwipeHint();
    this.clock.getDelta(); // reset
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this._showScreen('pause');
  }

  resume() {
    this.state = 'playing';
    this._hideOverlay();
    this.clock.getDelta();
  }

  togglePause() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  returnToMenu() {
    this.state = 'menu';
    this.ui.hud.classList.add('hidden');
    this._showScreen('menu');
  }

  // ================= Aksiyonlar =================
  _throwPerfume() {
    const p = this.player;
    if (p.throwCooldown > 0 || p.ammo <= 0) return;
    p.ammo--; p.throwCooldown = C.THROW_COOLDOWN;
    this._updateEnergyBar();
    const proj = this.pools.projectiles.acquire();
    if (!proj) return;
    proj.position.set(p.x, 1.15, C.PLAYER_Z - 0.6);
    proj.userData.vel = new THREE.Vector3(0, 2.6, -22);
    this.audio.throwSfx();
  }

  _boost() {
    // Edibe modunda kısa süreli hız hamlesi (Devrim'e yaklaşmayı hızlandırır); enerji dolana kadar şarj olur.
    const p = this.player;
    if (p.boostCooldown > 0) return;
    p.speedBoostTimer = Math.max(p.speedBoostTimer, 1.1);
    p.boostCooldown = C.BOOST_COOLDOWN;
    this.audio.powerUp();
  }

  // ================= HUD Yardımcıları =================
  _updateLifeBar() {
    const pct = Math.max(0, this.player.lives / C.START_LIVES) * 100;
    this.ui.lifeFill.style.width = `${pct}%`;
  }

  _updateEnergyBar() {
    const p = this.player;
    const pct = this.mode === C.MODE.HACI
      ? (p.ammo / C.MAX_AMMO) * 100
      : (1 - p.boostCooldown / C.BOOST_COOLDOWN) * 100;
    this.ui.energyFill.style.width = `${clampX(pct, 0, 100)}%`;
  }

  _updateLevel() {
    const level = 1 + Math.floor(this.elapsed / C.LEVEL_INTERVAL_SEC);
    this.ui.levelPill.textContent = String(level).padStart(2, '0');
  }

  _showSwipeHint() {
    const el = this.ui.swipeHint;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    this._swipeHintTimeout = setTimeout(() => this._dismissSwipeHint(), 4000);
  }

  _dismissSwipeHint() {
    clearTimeout(this._swipeHintTimeout);
    this.ui.swipeHint.classList.add('hidden');
  }

  // ================= Ana Döngü =================
  _loop = () => {
    requestAnimationFrame(this._loop);
    let delta = this.clock.getDelta();
    delta = Math.min(delta, C.MAX_DELTA);
    const t = this.clock.elapsedTime;

    this.fireflies.update(t);
    this.effects.update(delta);

    if (this.state === 'playing') {
      this.elapsed += delta;
      this._updatePlayer(delta);
      this._updateSpawning(delta);
      this._updateMovingObjects(delta);
      this._updateProjectiles(delta);
      if (this.mode === C.MODE.EDIBE) this._updateChase(delta);
      this._updateScore(delta);
      this._updateLevel();
      this.ground.update(delta, this._currentSpeed());
      this.skyline.update(delta, this._currentSpeed());
    }

    this._updateCamera(delta);
    this.composer.render();
  };

  _currentSpeed() {
    const ramp = Math.min(C.MAX_SPEED_BONUS, this.elapsed * C.SPEED_RAMP_PER_SEC);
    const boost = this.player?.speedBoostTimer > 0 ? 5 : 0;
    return C.BASE_SPEED + ramp + boost;
  }

  _updatePlayer(delta) {
    const p = this.player;
    const smoothT = 1 - Math.exp(-delta / C.LANE_SMOOTH_TIME);
    const targetX = C.LANE_X[p.targetLane];
    const prevX = p.x;
    p.x = THREE.MathUtils.lerp(p.x, targetX, smoothT);
    p.lateralVel = (p.x - prevX) / Math.max(delta, 0.0001);
    p.lane = p.targetLane;

    if (p.invulnTimer > 0) p.invulnTimer -= delta;
    if (p.speedBoostTimer > 0) p.speedBoostTimer -= delta;
    if (p.throwCooldown > 0) p.throwCooldown -= delta;
    if (p.boostCooldown > 0) {
      p.boostCooldown = Math.max(0, p.boostCooldown - delta);
      this._updateEnergyBar();
    }

    p.ammoRegenTimer += delta;
    if (p.ammo < C.MAX_AMMO && p.ammoRegenTimer >= C.AMMO_REGEN_SEC) {
      p.ammoRegenTimer = 0; p.ammo++; this._updateEnergyBar();
    }

    const flashing = p.invulnTimer > 0 && Math.floor(p.invulnTimer * 14) % 2 === 0;

    if (this.mode === C.MODE.HACI) {
      const rig = this.haciRig;
      rig.position.set(p.x, 0, C.PLAYER_Z);
      applyLaneBank(rig, p.lateralVel);
      animateRunCycle(rig.userData, this.clock.elapsedTime, 1 + (p.speedBoostTimer > 0 ? 0.6 : 0));
      rig.visible = !flashing;
    } else {
      const rig = this.edibeRig;
      rig.position.set(p.x, 0, C.PLAYER_Z);
      animateFlight(rig.userData, this.clock.elapsedTime, p.lateralVel);
      rig.visible = !flashing;
      if (Math.random() < 0.5) {
        this.effects.sparklePool?.spawn?.({
          position: new THREE.Vector3(p.x, 1.0, C.PLAYER_Z + 0.4),
          velocity: new THREE.Vector3((Math.random() - 0.5) * 0.5, -0.5, 2),
          color: 0x7fe7ff, size: 0.16, life: 0.35, gravity: 0,
        });
      }
    }
  }

  _laneFreeSet(excludeCount) {
    const lanes = [0, 1, 2];
    const chosen = [];
    while (chosen.length < excludeCount && lanes.length > 1) {
      const idx = Math.floor(Math.random() * lanes.length);
      chosen.push(lanes.splice(idx, 1)[0]);
    }
    return chosen;
  }

  _updateSpawning(delta) {
    const difficulty = Math.min(1, this.elapsed / 60);
    const interval = THREE.MathUtils.lerp(1.35, 0.72, difficulty);

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = interval + Math.random() * 0.25;
      const multi = Math.random() < 0.18 + difficulty * 0.25;
      const lanes = this._laneFreeSet(multi ? 2 : 1);
      const pools = this.mode === C.MODE.HACI ? this.pools.ground : this.pools.air;
      for (const lane of lanes) {
        const pool = pools[Math.floor(Math.random() * pools.length)];
        const obj = pool.acquire();
        if (!obj) continue;
        obj.position.set(C.LANE_X[lane], this.mode === C.MODE.HACI ? 0 : 1.3, C.SPAWN_Z);
        obj.userData.hit = false;
      }
    }

    if (this.mode === C.MODE.HACI) {
      this.waterSpawnTimer -= delta;
      if (this.waterSpawnTimer <= 0) {
        this.waterSpawnTimer = 2.6 + Math.random() * 1.4;
        const lane = Math.floor(Math.random() * C.LANE_COUNT);
        const bottle = this.pools.water.acquire();
        if (bottle) {
          bottle.position.set(C.LANE_X[lane], 1.05, C.SPAWN_Z - 4);
          bottle.userData.collected = false;
        }
      }
    }
  }

  _updateMovingObjects(delta) {
    const speed = this._currentSpeed();
    const dz = speed * delta;
    const t = this.clock.elapsedTime;
    const pools = this.mode === C.MODE.HACI ? this.pools.ground : this.pools.air;

    for (const pool of pools) {
      for (const obj of pool.active) {
        obj.position.z += dz;
        if (obj.userData.kind === 'birds') updateBirdFlock(obj, t);
        else obj.rotation.y += delta * 0.4;
        if (!obj.userData.hit && this._hitPlayer(obj, obj.userData.radius)) {
          obj.userData.hit = true;
          this._onPlayerHit(obj.position);
        }
        if (obj.position.z > C.DESPAWN_Z) pool.release(obj);
      }
    }

    if (this.mode === C.MODE.HACI) {
      for (const bottle of this.pools.water.active) {
        bottle.position.z += dz;
        bottle.rotation.y += delta * bottle.userData.spin;
        bottle.position.y = 1.05 + Math.sin(t * 3 + bottle.position.x) * 0.08;
        if (!bottle.userData.collected && this._hitPlayer(bottle, bottle.userData.radius)) {
          bottle.userData.collected = true;
          this._onWaterCollected(bottle.position);
          this.pools.water.release(bottle);
          continue;
        }
        if (bottle.position.z > C.DESPAWN_Z) this.pools.water.release(bottle);
      }
    }
  }

  _hitPlayer(obj, radius) {
    if (this.player.invulnTimer > 0) return false;
    const dx = obj.position.x - this.player.x;
    const dz = obj.position.z - C.PLAYER_Z;
    const r = (radius || 0.6) + C.PLAYER_HIT_RADIUS;
    return dx * dx + dz * dz <= r * r;
  }

  _updateProjectiles(delta) {
    if (this.mode !== C.MODE.HACI) return;
    for (const proj of this.pools.projectiles.active) {
      proj.userData.vel.y -= 9.8 * delta;
      proj.position.addScaledVector(proj.userData.vel, delta);
      proj.rotation.x += delta * 10;

      let hit = false;
      for (const pool of this.pools.ground) {
        for (const obs of pool.active) {
          if (obs.userData.hit) continue;
          const dx = obs.position.x - proj.position.x;
          const dz = obs.position.z - proj.position.z;
          const r = (obs.userData.radius || 0.6) + C.PROJECTILE_HIT_RADIUS * 0.4;
          if (dx * dx + dz * dz <= r * r) {
            obs.userData.hit = true;
            this.effects.perfumeExplosion(obs.position.clone().setY(0.6));
            this.audio.explosion();
            this._addScore(80);
            pool.release(obs);
            hit = true;
            break;
          }
        }
        if (hit) break;
      }

      if (hit || proj.position.y < -0.5 || proj.position.z < C.SPAWN_Z - 5) {
        if (!hit) { /* ıskalayan şişe sessizce kaybolur */ }
        this.pools.projectiles.release(proj);
      }
    }
  }

  _updateChase(delta) {
    const d = this.devrim;
    d.changeTimer -= delta;
    if (d.changeTimer <= 0) {
      d.changeTimer = 1.1 + Math.random() * 1.1;
      const options = [0, 1, 2].filter((l) => l !== d.lane);
      d.targetLane = options[Math.floor(Math.random() * options.length)];
    }
    const smoothT = 1 - Math.exp(-delta / C.LANE_SMOOTH_TIME);
    d.x = THREE.MathUtils.lerp(d.x, C.LANE_X[d.targetLane], smoothT);
    d.lane = d.targetLane;

    const closeBonus = this.player.speedBoostTimer > 0 ? 3.2 : 0;
    const netRate = C.CHASE_CLOSE_RATE + closeBonus - C.CHASE_DRIFT_RATE - d.difficulty;
    d.gapZ = clampX(d.gapZ - netRate * delta, C.CHASE_CATCH_DISTANCE * 0.6, C.CHASE_MAX_GAP);

    this.devrimRig.position.set(d.x, 0, C.PLAYER_Z - d.gapZ);
    animateRunCycle(this.devrimRig.userData, this.clock.elapsedTime, 1.3);

    const pct = 1 - (d.gapZ - C.CHASE_CATCH_DISTANCE) / (C.CHASE_MAX_GAP - C.CHASE_CATCH_DISTANCE);
    this.ui.chaseFill.style.width = `${Math.round(clampX(pct, 0, 1) * 100)}%`;

    if (d.gapZ <= C.CHASE_CATCH_DISTANCE) {
      d.gapZ = C.CHASE_START_GAP + Math.random() * 4;
      d.difficulty = Math.min(2.4, d.difficulty + 0.35);
      this._addScore(220);
      this.effects.waterGlow(this.devrimRig.position.clone().setY(1.2));
      this.audio.catchWin();
      this._showPowerBanner("Devrim'i yakaladın! +220");
    }
  }

  _onPlayerHit(position) {
    const p = this.player;
    if (p.shieldActive) {
      p.shieldActive = false;
      p.invulnTimer = C.INVULN_TIME * 0.6;
      this.effects.hitSpark(position.clone().setY(1));
      this.audio.hit();
      this._showPowerBanner('Kalkan seni korudu!');
      return;
    }
    p.invulnTimer = C.INVULN_TIME;
    p.lives--;
    this.effects.hitSpark(position.clone().setY(1));
    this.audio.hit();
    this._camShake.time = 0.35; this._camShake.strength = 0.35;
    this._updateLifeBar();
    if (p.lives <= 0) this._triggerGameOver();
  }

  _onWaterCollected(position) {
    this.effects.waterGlow(position.clone().setY(1.1));
    this.effects.powerFlex(this.haciRig.position.clone().setY(1.1));
    this.audio.pickup();
    this._addScore(40);
    const p = this.player;
    p.ammo = Math.min(C.MAX_AMMO, p.ammo + 1);
    this._updateEnergyBar();
    triggerFlexPose(this.haciRig.userData, this.clock.elapsedTime);
    if (Math.random() < 0.5) {
      p.speedBoostTimer = C.POWER_DURATION;
      this._showPowerBanner('⚡ Süper Hız!');
    } else {
      p.shieldActive = true;
      this._showPowerBanner('🛡️ Yenilmezlik Kalkanı!');
    }
    this.audio.powerUp();
  }

  _updateScore(delta) {
    this._addScore(this._currentSpeed() * delta * 2.2, true);
  }

  _addScore(amount, silent = false) {
    this.score += amount;
    this._setScore(Math.floor(this.score));
  }

  _setScore(v) { this.ui.scoreValue.textContent = String(v); }

  _bannerTimeout = null;
  _showPowerBanner(text) {
    const el = this.ui.powerBanner;
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(this._bannerTimeout);
    this._bannerTimeout = setTimeout(() => el.classList.add('hidden'), 1800);
  }

  _triggerGameOver() {
    this.state = 'gameover';
    const finalScore = Math.floor(this.score);
    const key = this.mode === C.MODE.HACI ? 'haci' : 'edibe';
    const isNewBest = finalScore > this.bestScores[key];
    if (isNewBest) {
      this.bestScores[key] = finalScore;
      localStorage.setItem(`mk_best_${key}`, String(finalScore));
    }

    // Giriş yapılmışsa profildeki ve liderlik tablosundaki skoru da güncelle
    authService.updateBestScore(finalScore);

    this.ui.gameoverTitle.textContent = isNewBest ? '🏆 Yeni Rekor!' : 'Oyun Bitti';
    this.ui.finalScore.textContent = `Skor: ${finalScore}`;
    this.ui.gameoverBest.textContent = `En iyi (${key === 'haci' ? 'Hacı Sadık' : 'Edibe Teyze'}): ${this.bestScores[key]}`;
    this.audio.gameOver();
    this._updateBestLabel();
    this._showScreen('gameover');
  }

  _updateCamera(delta) {
    if (!this.camera) return;
    const followX = (this.player ? this.player.x : 0) * 0.6;
    const height = this.mode === C.MODE.EDIBE ? 4.9 : 4.3;
    const dist = this.mode === C.MODE.EDIBE ? 8.2 : 7.8;
    const desired = new THREE.Vector3(followX, height, C.PLAYER_Z + dist);
    const lookAt = new THREE.Vector3(followX * 1.2, this.mode === C.MODE.EDIBE ? 1.7 : 1.2, C.PLAYER_Z - 6);

    if (this._camShake.time > 0) {
      this._camShake.time -= delta;
      const s = this._camShake.strength * (this._camShake.time / 0.35);
      desired.x += (Math.random() - 0.5) * s;
      desired.y += (Math.random() - 0.5) * s;
    }

    const smoothT = 1 - Math.exp(-delta / C.CAMERA_SMOOTH_TIME);
    this.camera.position.lerp(desired, smoothT);
    this._camLookAt.lerp(lookAt, smoothT);
    this.camera.lookAt(this._camLookAt);
    if (this.player) {
      this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, -this.player.lateralVel * 0.01, 0.15);
    }
  }
}
